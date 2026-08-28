## Why

現在のプラットフォームは Cloudflare Workers / Pages / KV に依存しており、ランタイム制約（Edge 環境・Node.js 非互換）と Cloudflare 固有の API に強く結びついている。Kubernetes + Go への移行により、ホスティング環境の可搬性を高め、バックエンドの実装を標準的なサーバーサイド Go に統一する。フロントエンドの npm → pnpm 移行はパッケージインストール速度と lockfile の一貫性を改善する。

## What Changes

- **BREAKING** バックエンド: Cloudflare Workers (TypeScript/Hono) を Go サーバーに置き換える
  - `workers/` ディレクトリを新しい `backend/` (Go) に置き換え
  - Hono ルーティング → 標準 `net/http` または Echo/Chi
  - Cloudflare KV → 別の永続化レイヤー（Kubernetes 上の Redis など）
  - Cloudflare Cron Trigger → Kubernetes CronJob
- **BREAKING** インフラ: `terraform/` (Cloudflare) を `helm/` (Kubernetes Helm chart) に置き換える
  - Bitnami chart は使用しない（独自 chart を作成）
  - Cloudflare Pages → Kubernetes Deployment + Ingress でフロントエンドを serve
  - VAPID キーは Kubernetes Secret で管理
- **BREAKING** フロントエンド: npm → pnpm に移行する
  - `package-lock.json` を削除し `pnpm-lock.yaml` を追加
  - CI / Dockerfile のコマンドを `npm` → `pnpm` に変更

## Capabilities

### New Capabilities

- `infra/kubernetes`: Helm chart を使った Kubernetes インフラ構成（Deployment・Service・Ingress・ConfigMap・Secret・CronJob）
- `backend/go-push-api`: Go によるプッシュ通知 API の実装（Subscribe / Unsubscribe・Web Push 送信・スケジュール実行）
- `frontend/pnpm`: フロントエンドの依存管理を npm から pnpm へ移行

### Modified Capabilities

（既存の spec はなし。新規プラットフォームとして全能力を新規追加する）

## Impact

- `workers/` — Go バックエンドへの完全置き換え（削除）
- `terraform/` — Helm chart へ移行（削除または最小化）
- `package.json` / `package-lock.json` — pnpm 化（`pnpm-lock.yaml` 追加、`node_modules` 再構築）
- `vite.config.ts` のプロキシ設定: Workers から Go サーバー（`localhost:8080` 等）へ変更
- Cloudflare VAPID / KV バインディング → Kubernetes Secret + Redis（または代替 KV）へ移行
- CLAUDE.md のデプロイ手順・開発環境記述の更新
