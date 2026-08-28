## 1. 事前準備: VAPID キー・namespace・ghcr.io 認証

- [ ] 1.1 `openssl ecparam -genkey -name prime256v1 | openssl pkcs8 -topk8 -nocrypt` で新しい VAPID キーペアを生成し、base64url エンコードして安全な場所に保管する
- [ ] 1.2 `kubectl create namespace gomi-no-hi` で専用 namespace を作成し、`kubectl get namespace gomi-no-hi` で存在を確認する
- [ ] 1.3 GitHub PAT（`write:packages` スコープ）を発行し、`echo <PAT> | docker login ghcr.io -u itk13201 --password-stdin` で認証できることで確認する
- [ ] 1.4 `kubectl create secret docker-registry ghcr-secret --docker-server=ghcr.io --docker-username=itk13201 --docker-password=<PAT> -n gomi-no-hi` で imagePullSecret を作成する

## 2. フロントエンド: npm → pnpm 移行

- [ ] 2.1 `pnpm import` を実行して `package-lock.json` から `pnpm-lock.yaml` を生成し、`package-lock.json` を削除する（`pnpm install` が正常完了することで確認）
- [ ] 2.2 ルートの `package.json` に `"packageManager": "pnpm@<実際のバージョン>"` フィールドを追加し、`pnpm run build` が成功することで確認する
- [ ] 2.3 `.gitignore` に `pnpm-lock.yaml` が除外されていないことを確認し、`package-lock.json` の行を削除する

## 3. Go バックエンド: プロジェクト初期化とスケジュールデータ変換

- [ ] 3.1 `backend/` ディレクトリを作成し、`go mod init github.com/itk13201/gomi-no-hi/backend` を実行する（`go.mod` が生成されることで確認）
- [ ] 3.2 `github.com/gin-gonic/gin` と必要な Go 依存を `go get` で追加し、`go build ./...` が通ることで確認する
- [ ] 3.3 `internal/handler/`・`internal/usecase/`・`internal/service/`・`internal/domain/`・`cmd/api/` のディレクトリ構成を作成し、`main.go` にエントリポイント（HTTP サーバー起動 + シグナルハンドリング）と `notify` サブコマンドを実装して `go run ./cmd/api -h` でヘルプが表示されることで確認する
- [ ] 3.4 `workers/src/schedule.ts` を `backend/data/schedule.json` に変換し（`{ "date": "YYYY-MM-DD", "types": [...] }` の配列）、`//go:embed data/schedule.json` で読み込むパッケージを実装して `go test` で日付引き当てが正しいことを確認する

## 4. Go バックエンド: API 実装

- [ ] 4.1 `GET /healthz` エンドポイントを実装し、`curl localhost:8080/healthz` が `{"status":"ok"}` と 200 を返すことで確認する
- [ ] 4.2 `POST /api/subscribe` エンドポイントを実装し、正常リクエストで 200・不正リクエストで 400 が返ることを単体テストで確認する（`go test ./...`）
- [ ] 4.3 `DELETE /api/subscribe` エンドポイントを実装し、既存・未登録いずれも 200 が返ることを単体テストで確認する（`go test ./...`）
- [ ] 4.4 Redis クライアント（`github.com/redis/go-redis/v9`）を追加し、パスワード認証付きで購読データの CRUD を実装する（`docker run -e REQUIREPASS=test redis` でインテグレーションテストが通ることで確認）

## 5. Go バックエンド: Web Push 実装

- [ ] 5.1 RFC 8291 に準拠した ECDH-ES キー生成・共有秘密導出を `crypto/elliptic` で実装し、TypeScript 実装と同一テストベクターで単体テストを通す
- [ ] 5.2 RFC 8188 の HTTP Encrypted Content Encoding（AES-128-GCM）を実装し、単体テストで暗号化・復号のラウンドトリップを確認する
- [ ] 5.3 VAPID JWT 生成（ES256）を `golang-jwt/jwt/v5` で実装し（`VAPID_SUBJECT` を `sub` クレームに使用）、生成した JWT をデコードして claims が正しいことを単体テストで確認する
- [ ] 5.4 Web Push 送信関数を実装し、`endpoint` への HTTP POST が成功する E2E テスト（またはモック）で確認する
- [ ] 5.5 push service から 410/404 が返った場合に購読データを削除するクリーンアップ処理を実装し、単体テストで確認する

## 6. Go バックエンド: バッチ通知処理

- [ ] 6.1 `schedule.json` から当日・翌日の収集日を引き当て、`morningHour` / `eveningHour` と現在時刻（JST）を照合して通知対象を絞り込む関数を実装し、単体テストで確認する
- [ ] 6.2 全購読者を Redis から取得し通知対象に絞り込んでプッシュ送信するバッチ関数を実装し、`notify` サブコマンドから呼び出して `go run ./cmd/api notify` が正常終了することで確認する

## 7. Go バックエンド: Docker イメージ & ghcr.io push

- [ ] 7.1 multi-stage build の `backend/Dockerfile` を作成し（ビルドステージ: `golang:1.26-alpine`、実行ステージ: `gcr.io/distroless/static:debug`）、`docker build -t ghcr.io/itk13201/gomi-no-hi-backend:latest ./backend` が成功することで確認する
- [ ] 7.2 コンテナ内で `./api notify` が正常終了し、`./api` がポート 8080 で起動することを `docker run` で確認する
- [ ] 7.3 `docker push ghcr.io/itk13201/gomi-no-hi-backend:latest` で ghcr.io へのプッシュが成功し、GitHub Packages 上でイメージが確認できることで検証する

## 8. フロントエンド: Docker イメージ & ghcr.io push

- [ ] 8.1 `Dockerfile.frontend` を作成し（ビルドステージ: `node:24-alpine` + pnpm、実行ステージ: `nginx:alpine`）、`nginx.conf`（SPA フォールバック `try_files $uri /index.html`）をイメージにベイクして `docker build -t ghcr.io/itk13201/gomi-no-hi-frontend:latest -f Dockerfile.frontend .` が成功することで確認する
- [ ] 8.2 コンテナ内で `curl localhost/` が HTML を返すことを `docker run` で確認する
- [ ] 8.3 `docker push ghcr.io/itk13201/gomi-no-hi-frontend:latest` で ghcr.io へのプッシュが成功することで確認する

## 9. Helm chart: 骨格作成

- [ ] 9.1 `helm create helm/gomi-no-hi` で雛形を生成し、不要なデフォルトテンプレートを削除した上で chart 構造（`Chart.yaml`・`values.yaml`・`templates/`）が揃っていることで確認する
- [ ] 9.2 `Chart.yaml` にアプリバージョン・説明・メンテナーを記入し、`helm lint helm/gomi-no-hi` が警告なしで通ることで確認する

## 10. Helm chart: リソーステンプレート実装

- [ ] 10.1 `frontend-deployment.yaml` テンプレートを実装し（Nginx コンテナ、replicas・image を values 参照）、`helm template` でレンダリングが正しいことで確認する
- [ ] 10.2 `frontend-service.yaml`（ClusterIP）テンプレートを実装し、`helm template` で Service が正しく定義されることで確認する
- [ ] 10.3 `redis-secret.yaml` テンプレートを実装し（`REDIS_PASSWORD` を base64 エンコード）、`helm template` で Secret が正しく生成されることで確認する
- [ ] 10.4 `redis-deployment.yaml`・`redis-service.yaml`・`redis-pvc.yaml` テンプレートを実装し（Bitnami 不使用、`redis:7-alpine`、AOF 有効、`redis-secret` から `REDIS_PASSWORD` を `requirepass` に注入）、`helm template` で確認する
- [ ] 10.5 `backend-secret.yaml` テンプレートを実装し（`VAPID_PUBLIC_KEY`・`VAPID_PRIVATE_KEY`・`VAPID_SUBJECT` を base64 エンコード）、`helm template` で 3 つのキーが正しく生成されることで確認する
- [ ] 10.6 `backend-deployment.yaml` テンプレートを実装し（`backend-secret` と `redis-secret` の両方を `secretKeyRef` で注入、`REDIS_ADDR` を values の `redis.host`/`redis.port` から env で注入、`GIN_MODE` を values から注入、liveness probe に `/healthz`、`checksum/secret` アノテーション付き）、`helm template` で確認する
- [ ] 10.7 `backend-service.yaml`（ClusterIP）テンプレートを実装し、`helm template` で確認する
- [ ] 10.8 `backend-cronjob.yaml` テンプレートを実装し（毎時実行・`concurrencyPolicy: Forbid`・バックエンドイメージの `notify` サブコマンドを実行）、`helm template` で確認する

## 11. Helm chart: values.yaml 整備

- [ ] 11.1 以下のすべてを values.yaml に定義し、`helm lint` で確認する
  - イメージリポジトリ（`ghcr.io/itk13201/gomi-no-hi-backend` 等）・タグ
  - レプリカ数・リソース制限（requests/limits）
  - `imagePullSecrets: [ghcr-secret]`
  - `redis.host: redis`・`redis.port: 6379`・`redis.storage.size: 1Gi`・`redis.storageClass: ""`
  - `backend.env.GIN_MODE: release`
- [ ] 11.2 `helm upgrade --set backend.image.tag=test` でバックエンド Deployment のイメージタグが変わることを `helm template` で確認する

## 12. ローカル統合検証

- [ ] 12.1 `helm install gomi-no-hi ./helm/gomi-no-hi -n gomi-no-hi -f values.local.yaml` を実行し、全 Pod が Running になることで確認する
- [ ] 12.2 `kubectl port-forward -n gomi-no-hi svc/backend 8080:8080` でバックエンドに接続し、`POST /api/subscribe` → `DELETE /api/subscribe` → `GET /healthz` が期待通りに応答することで確認する
- [ ] 12.3 `vite.config.ts` のプロキシ設定を `localhost:8787`（Wrangler）から `localhost:8080`（Go サーバー）に変更し、`pnpm run dev` で開発サーバーが起動してプッシュ通知購読が動作することで確認する
- [ ] 12.4 CronJob を `kubectl create job --from=cronjob/gomi-no-hi-notify test-run -n gomi-no-hi` で手動実行し、Job が Completed になることで確認する

## 13. ドキュメント更新・旧ファイル削除

- [ ] 13.1 `CLAUDE.md` のデプロイ手順・開発環境・ローカル Push 通知テスト手順を新構成（pnpm / Go / Helm / ghcr.io）に合わせて更新する
- [ ] 13.2 `workers/` ディレクトリ・`terraform/` ディレクトリ・ルートの `wrangler.jsonc` を削除する（git 履歴で復元可能）
- [ ] 13.3 新しい `backend/AGENTS.md`・`helm/AGENTS.md` を作成する
