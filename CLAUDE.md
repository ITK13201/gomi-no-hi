# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 構成方針

**ルートの CLAUDE.md は最小限の情報のみ記載する。**
ディレクトリ固有の情報は各ディレクトリ配下の `AGENTS.md` に記載されている。
作業対象のディレクトリに `AGENTS.md` があれば必ず先に読むこと。

```
src/data/       → AGENTS.md（地区データの更新手順・フォーマット規約）
src/components/ → AGENTS.md（コンポーネント規約・Tailwind 注意点）
src/pages/      → AGENTS.md（ページ構成・Safe Area 対応）
src/hooks/      → AGENTS.md（カスタムフック規約）
src/store/      → AGENTS.md（Zustand ストア規約）
workers/        → AGENTS.md（Cloudflare Workers API・Web Push 実装）
terraform/      → AGENTS.md（インフラ構成・IP 制限・シークレット管理・v5 構文注意点）
```

## 開発環境

```bash
# ディレクトリに cd するだけで nix develop が自動ロードされる（direnv）
npm run dev      # 開発サーバー
npm run build    # tsc -b && vite build
npm run preview  # 本番ビルドの確認
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

**収集カレンダー PDF を渡したら `src/data/` 以下の3ファイルを生成・更新する。**
詳細フォーマットは `src/data/AGENTS.md` を参照。

1. `src/data/config.ts` — 地区名・連絡先・期間
2. `src/data/schedule.ts` — 収集日データ（YYYY-MM-DD 形式）
3. `src/data/wasteTypes.ts` — 品目マスター（既存地区で変更不要な場合が多い）

## Service Worker

`vite.config.ts` は `injectManifest` モードを使用。カスタム SW は `src/sw.ts`。
`generateSW` モードに戻してはいけない（push イベントハンドラが消える）。

## デプロイ

**PWA（Cloudflare Pages）**: GitHub push で自動ビルド・デプロイ。
ビルドコマンド: `npm run build` / 出力: `dist` / Node.js: 24

**Workers API**: `workers/` 配下。Terraform でデプロイする（GitHub 連携なし）。
```bash
cd workers && npm run build   # workers/dist/index.js を生成
cd ..
op run --env-file=terraform/.env.1password -- terraform apply
```

**wrangler の設定ファイルが2つある:**
- `wrangler.jsonc`（ルート）— Pages 用（assets）
- `workers/wrangler.toml` — Workers API 用

`workers/` でコマンドを実行するときは必ず `--config wrangler.toml` を付けること（ルートの `wrangler.jsonc` を誤って読む）。

## Terraform

Cloudflare インフラ（Workers・KV・WAF・Pages）はすべて `terraform/` 配下の Terraform で管理する。

**Terraform コードを書く・編集するときは必ず `.mcp.json` の Terraform MCP server を参照すること。**
リソース仕様・引数・バージョン互換性をコード記述前に確認する。
