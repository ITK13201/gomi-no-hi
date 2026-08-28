## Purpose

Cloudflare Workers (TypeScript/Hono) で実装されていたプッシュ通知 API を Go サーバーとして再実装し、標準的な HTTP サーバーとして Kubernetes 上で動作させる。

## ADDED Requirements

### Requirement: 購読登録エンドポイント
システムは `POST /api/subscribe` で Web Push 購読データを受け付け、永続化しなければならない（SHALL）。

#### Scenario: 有効な購読データの登録
- **WHEN** クライアントが `{ endpoint, keys: { p256dh, auth }, morningHour, eveningHour }` を POST する
- **THEN** サーバーは 200 OK を返し、購読データを保存する

#### Scenario: 不正なリクエストボディ
- **WHEN** クライアントが必須フィールドを欠いたボディを POST する
- **THEN** サーバーは 400 Bad Request を返す

### Requirement: 購読解除エンドポイント
システムは `DELETE /api/subscribe` で購読データを削除しなければならない（SHALL）。

#### Scenario: 購読解除
- **WHEN** クライアントが `{ endpoint }` を DELETE で送信する
- **THEN** サーバーは 200 OK を返し、対応する購読データを削除する

#### Scenario: 存在しない購読の解除
- **WHEN** 登録されていない endpoint で DELETE を送信する
- **THEN** サーバーは 200 OK を返す（冪等）

### Requirement: VAPID JWT を使った Web Push 送信
システムは RFC 8291 / RFC 8188 に準拠した暗号化と VAPID JWT を使って Web Push 通知を送信しなければならない（SHALL）。

#### Scenario: プッシュ通知送信
- **WHEN** 通知送信処理が起動する
- **THEN** サーバーは各購読者の endpoint に対して暗号化済みペイロードを HTTP POST する

#### Scenario: endpoint 失効時のクリーンアップ
- **WHEN** push service から 410 Gone または 404 Not Found が返る
- **THEN** サーバーはその購読データを削除する

### Requirement: スケジュール通知バッチ
システムは全購読者を走査して morningHour / eveningHour に基づくプッシュ通知を送信するバッチ処理を提供しなければならない（SHALL）。

#### Scenario: バッチコマンドの実行
- **WHEN** スケジューラ（Kubernetes CronJob など）がバッチコマンドを実行する
- **THEN** 対象時刻の購読者にプッシュ通知が送信される

### Requirement: ヘルスチェックエンドポイント
システムは `GET /healthz` で 200 OK を返すヘルスチェックエンドポイントを提供しなければならない（SHALL）。

#### Scenario: ヘルスチェック
- **WHEN** Kubernetes liveness probe が `GET /healthz` を呼ぶ
- **THEN** サーバーは `{ status: "ok" }` と 200 OK を返す
