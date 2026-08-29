# backend/AGENTS.md

Go バックエンド API の実装規約・手順。

## ディレクトリ構成

```
backend/
├── cmd/api/main.go          — エントリポイント（HTTP サーバー + notify サブコマンド）
├── internal/
│   ├── domain/              — ドメイン型定義（Subscription など）
│   ├── handler/             — Gin ハンドラ（HTTP ルーティング）
│   ├── service/             — ビジネスロジック（Redis CRUD・Web Push・通知バッチ）
│   └── usecase/             — 将来のユースケース層（現在未使用）
├── internal/service/data/
│   └── schedule.json        — 収集スケジュール（//go:embed で埋め込み）
└── Dockerfile               — multi-stage build（golang:1.24-alpine → distroless/static:debug）
```

## Go モジュール

```
module: github.com/itk13201/gomi-no-hi/backend
主要依存:
  - github.com/gin-gonic/gin
  - github.com/redis/go-redis/v9
  - github.com/golang-jwt/jwt/v5
  - golang.org/x/crypto (hkdf)
  - github.com/alicebob/miniredis/v2 (テスト用)
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `REDIS_ADDR` | Redis 接続先 | `localhost:6379` |
| `REDIS_PASSWORD` | Redis パスワード | （空） |
| `VAPID_PUBLIC_KEY` | VAPID 公開鍵（base64url、uncompressed 65bytes） | — |
| `VAPID_PRIVATE_KEY` | VAPID 秘密鍵（base64url、raw 32bytes） | — |
| `VAPID_SUBJECT` | VAPID subject（mailto: or URL） | `mailto:admin@example.com` |
| `GIN_MODE` | Gin モード | `debug` |

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/healthz` | ヘルスチェック（`{"status":"ok"}`） |
| POST | `/api/subscribe` | 購読登録 |
| DELETE | `/api/subscribe` | 購読解除 |

### POST /api/subscribe リクエスト

```json
{
  "endpoint": "https://push.example.com/...",
  "keys": { "p256dh": "<base64url>", "auth": "<base64url>" },
  "morningHour": 7,
  "eveningHour": 20
}
```

### DELETE /api/subscribe リクエスト

```json
{ "endpoint": "https://push.example.com/..." }
```

## スケジュールデータの更新

`src/data/schedule.ts` を更新したら `backend/internal/service/data/schedule.json` も同期する。
JSON 形式: `[{"date":"YYYY-MM-DD","types":["burnable",...]},...]`

## ローカル開発

```bash
# Redis を Docker で起動
docker run -d -p 6379:6379 redis:7-alpine

# バックエンド起動
REDIS_ADDR=localhost:6379 go run ./cmd/api

# バッチ通知テスト
REDIS_ADDR=localhost:6379 VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... go run ./cmd/api notify
```

## Docker ビルド

```bash
docker build -t ghcr.io/itk13201/gomi-no-hi-backend:latest .
docker run -e REDIS_ADDR=host.docker.internal:6379 -p 8080:8080 ghcr.io/itk13201/gomi-no-hi-backend:latest
```

## テスト

```bash
go test ./...
```

ハンドラテストは miniredis を使ってインメモリ Redis で動作する（外部 Redis 不要）。
