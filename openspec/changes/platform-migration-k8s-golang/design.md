## Context

現在の構成は Cloudflare Workers（TypeScript/Hono）+ Cloudflare Pages + KV Namespace で完結しており、Terraform でデプロイされている。バックエンドは Edge ランタイムに特化した実装（Web Crypto API、Cloudflare KV バインディング）を持ち、フロントエンドは npm で管理されている。移行の動機は proposal.md - Why を参照。

## Goals / Non-Goals

**Goals:**
- バックエンドを Go（標準ライブラリ + 最小限のフレームワーク）で再実装する
- フロントエンド・バックエンドを Kubernetes 上で稼働させる Helm chart を独自作成する
- フロントエンドの依存管理を pnpm に移行する
- 既存の Web Push 機能（購読登録・解除・VAPID 送信・スケジュール通知）を維持する

**Non-Goals:**
- Kubernetes cluster 自体のプロビジョニング（cluster は既存を前提とする）
- CI/CD パイプラインの自動化（手動 `helm upgrade` を想定）
- フロントエンドの機能変更
- Terraform コードの Helm への完全移行（DNS・証明書等の外部リソースは対象外）
- Ingress / ルーティング設定（クラスタ管理層が担当。chart は Service までを提供する）

## Decisions

### 1. Go フレームワーク: Gin

**選択**: `github.com/gin-gonic/gin`  
**理由**: 他プロジェクト（MoneyRabbit）でも Gin を採用しており、ミドルウェア・リクエストバインディング・エラーハンドリングの書き方を統一できる。  
**代替案**: Chi → `net/http` 互換だが他プロジェクトと統一できない。Echo → 機能は近いが採用実績なし。

### 2. 永続化: Redis（単一インスタンス）

**選択**: Kubernetes 上の Redis（独自 Deployment、Bitnami chart 不使用）  
**理由**: Cloudflare KV の代替として最も軽量。購読データは JSON 文字列として `sub:<hash>` キーで保存するため KV 互換の操作セットで十分。  
**代替案**: PostgreSQL → スキーマ管理が必要で過剰。etcd 直接利用 → 非推奨。

### 3. Helm chart 構成: 単一 chart、サブチャートなし

**選択**: `helm/gomi-no-hi/` 配下にすべてのリソースを配置する単一 chart。`gomi-no-hi` namespace に全リソースをデプロイする。chart に含むリソース: Frontend Deployment/Service・Backend Deployment/Service・backend-secret（VAPID キー）・Redis Deployment/Service/PVC・redis-secret（REDIS_PASSWORD）・CronJob。Ingress はクラスタ管理層が担当するため chart 外。Secret は用途別に分離し、Backend Deployment は両 Secret を参照する。  
**理由**: サービスが 2 つ（frontend + backend）と Redis のみ。サブチャートに分割する規模ではなく、単一 chart でテンプレートを管理した方が可視性が高い。Bitnami chart は使用しない（要件）。  
**代替案**: frontend/backend/redis を個別 chart → 依存管理が複雑になる。

### 4. CronJob: Go バイナリの `notify` サブコマンド

**選択**: バックエンドと同一コンテナイメージを使い、`CMD ["./api", "notify"]` でバッチ実行  
**理由**: 別イメージを管理しなくて済む。Go の `cobra` または `os.Args` でサブコマンドを分岐させる。  
**代替案**: 別バイナリ → イメージが増える。HTTP エンドポイント呼び出し → ネットワーク依存。

### 5. コンテナレジストリ: ghcr.io（GitHub Container Registry）

**選択**: `ghcr.io/itk13201/gomi-no-hi-backend` / `ghcr.io/itk13201/gomi-no-hi-frontend`  
**理由**: GitHub リポジトリと同一の認証基盤を使えるため追加のレジストリアカウントが不要。Kubernetes 側は `imagePullSecrets` に GitHub PAT を設定する。  
**代替案**: Docker Hub → パブリック公開が必要。プライベート Registry → 追加インフラが必要。

### 6. pnpm バージョン: `packageManager` フィールドで固定

**選択**: `package.json` に `"packageManager": "pnpm@X.Y.Z"` を追加し、Corepack で管理  
**理由**: チーム全員が同一バージョンを使うことを強制できる。`.nvmrc` 的な役割。  
**代替案**: `.pnpmrc` のみ → バージョン固定が弱い。

### 7. バックエンドディレクトリ構成: `internal/` レイヤー分割

**選択**: MoneyRabbit と同一の `internal/` パッケージ構成  
```
internal/handler/   — Gin ルーター・ハンドラ定義
internal/usecase/   — ビジネスロジック
internal/service/   — 外部サービス連携（Redis・Web Push）
internal/domain/    — ドメイン型定義
cmd/api/main.go     — エントリポイント（HTTP サーバー + notify サブコマンド）
```
**理由**: MoneyRabbit で実績のある構成を再利用することで実装判断コストを下げる。

### 9. スケジュールデータ: `//go:embed` でバイナリに埋め込む

**選択**: `workers/src/schedule.ts` を `backend/data/schedule.json` に変換し、`//go:embed` でバイナリに埋め込む  
**理由**: 外部ファイル読み込みや ConfigMap マウントが不要でシンプル。データ更新時は再ビルド・再デプロイするフローが schedule.ts 更新時と同じ感覚で操作できる。  
**代替案**: Kubernetes ConfigMap → 再デプロイなしで更新できるが、Volume Mount とパス管理が必要になる。

### 10. Redis 接続先: values.yaml で外部化

**選択**: `redis.host`（デフォルト: `redis`）・`redis.port`（デフォルト: `6379`）を values.yaml に定義し、Backend Deployment の env として注入する  
**理由**: Service 名が変わる場合や外部 Redis を使う場合に values 上書きだけで対応できる。  
**代替案**: Deployment に直接ハードコード → 変更のたびにテンプレートを編集する必要がある。

### 11. Helm: `checksum/secret` アノテーションによる Pod 自動再起動

**選択**: backend Deployment に `checksum/config: {{ include (print $.Template.BasePath "/backend-secret.yaml") . | sha256sum }}` アノテーションを付与  
**理由**: VAPID キーを Secret で更新した際に Pod が自動再起動し、新しい値が確実に反映される。MoneyRabbit で採用済みのパターン。  
**代替案**: 手動 `kubectl rollout restart` → 運用ミスが起きやすい。

## Risks / Trade-offs

- **Web Crypto API → Go 暗号実装の差異**: RFC 8291 の ECDH-ES + AESGCM と RFC 8188 の HTTP Encrypted Content Encoding を Go で正確に実装する必要がある。既存の TypeScript 実装を参考に単体テストで検証する。  
  → Mitigation: `golang.org/x/crypto` および標準 `crypto/elliptic` を使い、既存の TypeScript テストベクターを Go テストに移植する。

- **Redis の可用性**: 単一インスタンス Redis はクラッシュ時に購読データが失われるリスクがある。  
  → Mitigation: Redis の `appendonly yes` (AOF) を有効化する。高可用性が必要になった場合は Redis Sentinel を検討する（今回は Non-Goal）。

- **VAPID キー再生成による既存購読の無効化**: 新しい VAPID キーペアを生成すると、ブラウザに保存済みの既存プッシュ購読はすべて無効になり、ユーザーが再度購読操作を行う必要がある。  
  → Mitigation: 切り替えタイミングをユーザーに告知する。アプリ起動時に購読状態を再検証して、無効な場合は再購読を促す UI フローを実装する（既存の Service Worker ロジックで対応可能）。

## Migration Plan

1. **フロントエンド pnpm 移行**（最小リスク・最初に実施）
   - `npm install -g pnpm` → `pnpm import`（`package-lock.json` → `pnpm-lock.yaml`）
   - `package-lock.json` 削除、`packageManager` フィールド追加

2. **Go バックエンド実装**
   - `backend/` ディレクトリ作成、Go module 初期化（`internal/handler`・`usecase`・`service`・`domain` 構成）
   - Gin エンドポイント実装・単体テスト
   - Dockerfile 作成（ビルドステージ: `golang:1.26-alpine`、実行ステージ: `gcr.io/distroless/static:debug`）

3. **Helm chart 作成**
   - `kubectl create namespace gomi-no-hi`
   - `helm/gomi-no-hi/` 雛形作成
   - Frontend Deployment/Service・Backend Deployment/Service/Secret・Redis Deployment/Service/PVC・CronJob テンプレート（Ingress はクラスタ管理層が担当）
   - values.yaml 整備（イメージリポジトリ: `ghcr.io/itk13201/`・namespace: `gomi-no-hi`）

4. **ローカル検証**
   - セルフホストクラスタに `helm install gomi-no-hi ./helm/gomi-no-hi -f values.local.yaml` を実行して動作確認
   - vite proxy を localhost:8080（Go server）に切り替えてフロントエンドと結合

5. **旧ディレクトリの削除**
   - `workers/` と `terraform/` を削除する（git 履歴から復元可能）
   - Cloudflare Pages の無効化・KV の削除は手動で行う

