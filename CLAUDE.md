# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 構成方針

**ルートの CLAUDE.md は最小限の情報のみ記載する。**
ディレクトリ固有の情報は各ディレクトリ配下の `AGENTS.md` に記載されている。
作業対象のディレクトリに `AGENTS.md` があれば必ず先に読むこと。

```
frontend/src/data/       → AGENTS.md（地区データの更新手順・フォーマット規約）
frontend/src/components/ → AGENTS.md（コンポーネント規約・Tailwind 注意点）
frontend/src/pages/      → AGENTS.md（ページ構成・Safe Area 対応）
frontend/src/hooks/      → AGENTS.md（カスタムフック規約）
frontend/src/store/      → AGENTS.md（Zustand ストア規約）
backend/                 → AGENTS.md（Go API・Web Push・スケジュール通知実装）
helm/                    → AGENTS.md（Helm chart 構成・デプロイ手順）
```

## 開発環境

```bash
# ディレクトリに cd するだけで nix develop が自動ロードされる（direnv）

# フロントエンド
cd frontend
pnpm run dev      # 開発サーバー（/api → localhost:8080 にプロキシ）
pnpm run build    # tsc -b && vite build
pnpm run preview  # 本番ビルドの確認
# lint・format コマンドは存在しない。TypeScript strict チェック（tsc -b）がリンターを兼ねる。

# バックエンド（Go）
cd backend
go run ./cmd/api          # サーバー起動（ポート 8080）
go run ./cmd/api notify   # バッチ通知実行
go test ./...             # テスト実行
```

## TypeScript

- `strict: true` / `noUnusedLocals` / `noUnusedParameters` — 未使用の import・変数はビルドエラーになる
- `any` / `unknown` 型は使わない
- `noUncheckedSideEffectImports` — 副作用のみの import は禁止

## Tailwind CSS v4

**動的クラス名はバンドルに含まれない。** 文字列結合でクラス名を生成してはいけない。

```tsx
// NG: ビルド後に消える
className={`bg-${color}-300`}

// OK: インラインスタイルまたは静的クラス名を使う
style={{ backgroundColor: waste.color }}
```

## 地区データの更新ワークフロー

**収集カレンダー PDF を渡したら `frontend/src/data/` 以下の3ファイルと `backend/internal/service/data/schedule.json` を更新する。**
詳細フォーマットは `frontend/src/data/AGENTS.md` を参照。

1. `frontend/src/data/config.ts` — 地区名・連絡先・期間
2. `frontend/src/data/schedule.ts` — 収集日データ（YYYY-MM-DD 形式）
3. `frontend/src/data/wasteTypes.ts` — 品目マスター（既存地区で変更不要な場合が多い）

**`schedule.ts` を更新した場合は `backend/internal/service/data/schedule.json` も必ず同期すること。**
（バックエンドは `schedule.json` を `//go:embed` でバイナリに埋め込み、プッシュ通知の送信タイミングに使用する）

## ローカルでの Push 通知テスト

シークレットは 1Password で管理。`op run` 経由で注入する。

```bash
# Docker Compose でフルスタック起動
op run --env-file=.env.1password -- docker compose up -d

# バッチ通知を手動実行
op run --env-file=.env.1password -- docker compose --profile notify run --rm notify

# Go サーバーを直接起動（開発時）
op run --env-file=.env.1password -- bash -c 'REDIS_ADDR=localhost:6379 go run ./cmd/api'
```

詳細手順は `backend/AGENTS.md` を参照。

## Service Worker

`frontend/vite.config.ts` は `injectManifest` モードを使用。カスタム SW は `frontend/src/sw.ts`。
`generateSW` モードに戻してはいけない（push イベントハンドラが消える）。

## デプロイ

**フロントエンド（Docker イメージ）**:
```bash
docker build -t ghcr.io/itk13201/gomi-no-hi-frontend:latest frontend/
docker push ghcr.io/itk13201/gomi-no-hi-frontend:latest
```

**バックエンド（Docker イメージ）**:
```bash
docker build -t ghcr.io/itk13201/gomi-no-hi-backend:latest backend/
docker push ghcr.io/itk13201/gomi-no-hi-backend:latest
```

**Kubernetes（Helm）**:
```bash
op run --env-file=.env.1password -- helm upgrade --install gomi-no-hi ./helm/gomi-no-hi \
  -n gomi-no-hi \
  --set registry.username="$GITHUB_USERNAME" \
  --set registry.password="$GHCR_PAT" \
  --set backend.vapid.publicKey="$VAPID_PUBLIC_KEY" \
  --set backend.vapid.privateKey="$VAPID_PRIVATE_KEY" \
  --set backend.vapid.subject="$VAPID_SUBJECT" \
  --set redis.password="$REDIS_PASSWORD"
```

詳細手順は `helm/AGENTS.md` を参照。
