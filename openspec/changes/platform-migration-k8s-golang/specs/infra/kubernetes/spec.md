## Purpose

Kubernetes 上でアプリケーションを稼働させるための Helm chart 群を独自に定義し、フロントエンド（PWA）とバックエンド（Go API）を宣言的に管理できるようにする。

## ADDED Requirements

### Requirement: Helm chart による全リソース管理
システムは Bitnami 等の外部 chart ライブラリに依存せず、独自の Helm chart でフロントエンド・バックエンドのすべての Kubernetes リソースを管理しなければならない（SHALL）。

#### Scenario: chart install
- **WHEN** `helm install gomi-no-hi ./helm/gomi-no-hi -n gomi-no-hi` を実行する
- **THEN** Deployment・Service・Secret・PersistentVolumeClaim・CronJob が `gomi-no-hi` namespace 上に作成される（Ingress はクラスタ管理層が担当するため chart に含まない）

### Requirement: フロントエンド Deployment
システムは PWA の静的ファイルを serve する Nginx コンテナを Deployment として定義しなければならない（SHALL）。

#### Scenario: フロントエンド Pod 起動
- **WHEN** Deployment が Ready になる
- **THEN** Pod は Nginx コンテナを 1 つ以上起動し、HTTP 80 番でリクエストを受け付ける

### Requirement: バックエンド Deployment
システムは Go API サーバーを Deployment として定義しなければならない（SHALL）。

#### Scenario: バックエンド Pod 起動
- **WHEN** Deployment が Ready になる
- **THEN** Pod は Go API コンテナを 1 つ以上起動し、HTTP 8080 番でリクエストを受け付ける

### Requirement: VAPID キーの Secret 管理
システムは VAPID 公開鍵・秘密鍵・subject を `backend-secret` として Kubernetes Secret に格納し、バックエンド Pod に環境変数として注入しなければならない（SHALL）。

#### Scenario: backend-secret からの環境変数注入
- **WHEN** バックエンド Pod が起動する
- **THEN** `VAPID_PUBLIC_KEY`・`VAPID_PRIVATE_KEY`・`VAPID_SUBJECT` が環境変数として参照可能である

### Requirement: Redis パスワードの Secret 管理
システムは Redis パスワードを `redis-secret` として独立した Kubernetes Secret に格納しなければならない（SHALL）。Redis Deployment と Backend Deployment の両方がこの Secret を参照する。

#### Scenario: redis-secret からの環境変数注入
- **WHEN** バックエンド Pod が起動する
- **THEN** `REDIS_PASSWORD` が環境変数として参照可能である

#### Scenario: Redis requirepass 設定
- **WHEN** Redis Pod が起動する
- **THEN** Redis は `redis-secret` の `REDIS_PASSWORD` を `requirepass` として使用する

### Requirement: プッシュ通知スケジュール実行
システムは Kubernetes CronJob を使って毎時プッシュ通知送信を実行しなければならない（SHALL）。

#### Scenario: CronJob 定期実行
- **WHEN** Cron スケジュール（毎時）が発火する
- **THEN** バックエンドの通知送信エンドポイントまたはバッチコマンドが実行される

### Requirement: values.yaml による設定の外部化
システムはイメージタグ・レプリカ数・リソース制限・Redis 接続先（`redis.host`・`redis.port`）・Redis PVC サイズ（`redis.storage.size`）を values.yaml で設定可能にしなければならない（SHALL）。ルーティングはクラスタ管理層が担当するため、Ingress 関連の設定は values に含まない。

#### Scenario: イメージタグの上書き
- **WHEN** `helm upgrade --set backend.image.tag=v1.2.0` を実行する
- **THEN** バックエンド Deployment が指定タグのイメージを使用する
