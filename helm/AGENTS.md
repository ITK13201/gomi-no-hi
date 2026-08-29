# helm/AGENTS.md

Helm chart による Kubernetes デプロイの手順・構成。

## chart 構造

```
helm/gomi-no-hi/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── backend-cronjob.yaml    — 毎時通知バッチ（concurrencyPolicy: Forbid）
    ├── backend-deployment.yaml — Go API サーバー
    ├── backend-secret.yaml     — VAPID キー（backend-secret）
    ├── backend-service.yaml    — ClusterIP :8080
    ├── frontend-deployment.yaml — Nginx + PWA
    ├── frontend-service.yaml   — ClusterIP :80
    ├── redis-deployment.yaml   — Redis 7-alpine（AOF 有効）
    ├── redis-pvc.yaml          — PVC（デフォルト 1Gi）
    ├── redis-secret.yaml       — REDIS_PASSWORD（redis-secret）
    └── redis-service.yaml      — ClusterIP :6379
```

## デプロイ前の準備

1. Kubernetes namespace の作成:
   ```bash
   kubectl create namespace gomi-no-hi
   ```

`ghcr-secret`（imagePullSecret）は Helm chart が自動で作成する。`helm install/upgrade` 時に `registry.password` を渡せばよい。

## シークレット管理

シークレットは 1Password で管理する（`.env.1password` に `op://` URI を定義）。
`helm install/upgrade` は `op run` 経由で実行し、平文の values ファイルを作らない。

## インストール・アップグレード

```bash
# 初回インストール
op run --env-file=../.env.1password -- helm install gomi-no-hi ./helm/gomi-no-hi \
  -n gomi-no-hi \
  --set registry.username="$GITHUB_USERNAME" \
  --set registry.password="$GHCR_PAT" \
  --set backend.vapid.publicKey="$VAPID_PUBLIC_KEY" \
  --set backend.vapid.privateKey="$VAPID_PRIVATE_KEY" \
  --set backend.vapid.subject="$VAPID_SUBJECT" \
  --set redis.password="$REDIS_PASSWORD"

# アップグレード（イメージタグ指定）
op run --env-file=../.env.1password -- helm upgrade gomi-no-hi ./helm/gomi-no-hi \
  -n gomi-no-hi \
  --set registry.username="$GITHUB_USERNAME" \
  --set registry.password="$GHCR_PAT" \
  --set backend.vapid.publicKey="$VAPID_PUBLIC_KEY" \
  --set backend.vapid.privateKey="$VAPID_PRIVATE_KEY" \
  --set backend.vapid.subject="$VAPID_SUBJECT" \
  --set redis.password="$REDIS_PASSWORD" \
  --set backend.image.tag=v1.2.0 \
  --set frontend.image.tag=v1.2.0
```

## テンプレート確認

```bash
helm template gomi-no-hi ./helm/gomi-no-hi -n gomi-no-hi
helm lint ./helm/gomi-no-hi
```

## 注意事項

- Ingress はクラスタ管理層（クラスタ管理者）が担当。chart には含まない
- VAPID キー変更時は backend-secret が更新され、`checksum/secret` アノテーションにより Pod が自動再起動する
- Redis は単一インスタンス（AOF 有効）。高可用性が必要な場合は Redis Sentinel を検討
