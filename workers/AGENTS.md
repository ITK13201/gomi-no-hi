# workers/

Cloudflare Workers による Push 通知 API。Hono フレームワーク使用。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/index.ts` | Hono アプリ・エントリポイント（POST/DELETE `/api/subscribe`、Cron export） |
| `src/types.ts` | `PushSubscription`・`StoredSubscription`・`Env` 型定義 |
| `src/webpush.ts` | Web Push 暗号化（RFC 8291/8188）・VAPID JWT 生成（Web Crypto API） |
| `src/cron.ts` | 毎時実行：KV の購読リストを走査して push 通知を送信 |
| `src/schedule.ts` | 収集日データ（`src/data/schedule.ts` のコピー。変更時は両方更新） |

## ビルドとデプロイ

```bash
npm run build   # wrangler deploy --config wrangler.toml --dry-run --outdir dist
```

必ず `--config wrangler.toml` を指定すること。省略するとルートの `wrangler.jsonc`（Pages 用）を読んでしまう。

デプロイは Terraform 経由で行う（`wrangler deploy` は使わない）。

```bash
cd ..
op run --env-file=terraform/.env.1password -- terraform apply
```

## 環境変数（Workers バインディング）

| 変数 | 種別 | 用途 |
|---|---|---|
| `KV` | KV Namespace | 購読データの保存 |
| `VAPID_PUBLIC_KEY` | plain_text | VAPID 公開鍵（base64url） |
| `VAPID_PRIVATE_KEY` | secret_text | VAPID 秘密鍵（base64url） |
| `VAPID_SUBJECT` | plain_text | `mailto:` または `https://` URL |

すべて Terraform（`terraform/main.tf`）で管理。ローカル開発用の値は `wrangler.toml`（公開鍵）と `workers/.dev.vars`（秘密鍵）に記載。

## KV スキーマ

- キー: `sub:<SHA-256(endpoint).slice(0,16)>`
- 値: `StoredSubscription` を JSON シリアライズ

```typescript
type StoredSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  morningHour: number   // 当日朝の通知時刻（JST）
  eveningHour: number   // 前日夜の通知時刻（JST）
  subscribedAt: string  // ISO 8601
}
```

## ローカル開発・デバッグ

```bash
# push 通知をローカルでテストする場合
# 1. workers/.dev.vars に VAPID_PRIVATE_KEY を記載（gitignore 済み）
# 2. ルートの .env.local に VITE_VAPID_PUBLIC_KEY を記載（gitignore 済み）
# 3. vite.config.ts の server.proxy で /api → localhost:8787 に転送済み

cd workers && npx wrangler dev --config wrangler.toml --test-scheduled
# 別ターミナルで cron を手動トリガー（hour=N で JST 時刻を指定可）
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

本番の cron を手動トリガーする場合は `/api/test-cron?hour=N` エンドポイントを使う（WAF で IP 制限済み）。

```bash
# 本番ログのリアルタイム監視
npx wrangler tail --config wrangler.toml
```

## 注意事項

- ECDH の `deriveBits` では `public` を使う（`$public` は `@cloudflare/workers-types` の型定義バグで、V8 ランタイムは Web Crypto 仕様の `public` を要求する）。Workers 環境には `EcdhKeyDeriveParams` 型がないため `// @ts-expect-error` でエラーを抑制している
- `generateKey` の戻り値は `CryptoKeyPair` にキャストする
- `exportKey('raw', ...)` の戻り値は `ArrayBuffer` にキャストする
- `src/schedule.ts` は PWA 側の `src/data/schedule.ts` と内容を同期すること
