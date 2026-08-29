# helm/AGENTS.md

Helm chart による Kubernetes デプロイの手順・構成。

## chart 構造

```
helm/gomi-no-hi/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── _helpers.tpl
    ├── backend-cronjob.yaml     — 毎時通知バッチ（concurrencyPolicy: Forbid）
    ├── backend-deployment.yaml  — Go API サーバー
    ├── backend-secret.yaml      — VAPID キー + REDIS_PASSWORD（existingSecret 未設定時に作成）
    ├── backend-service.yaml     — ClusterIP :8080
    ├── frontend-deployment.yaml — Nginx + PWA
    ├── frontend-service.yaml    — ClusterIP :80
    ├── redis-deployment.yaml    — Redis 7-alpine（AOF 有効）
    ├── redis-pvc.yaml           — PVC（persistence.enabled 時）
    ├── redis-secret.yaml        — REDIS_PASSWORD（existingSecret 未設定時に作成）
    └── redis-service.yaml       — ClusterIP :6379
```

## Secret 構成

| Secret | 管理 | キー |
|--------|------|------|
| backend-secret | Helm または既存 | `VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `VAPID_SUBJECT` `REDIS_PASSWORD` |
| redis-secret | Helm または既存 | `REDIS_PASSWORD` |
| imagePullSecret | **Helm 外（クラスタ共通）** | `.dockerconfigjson` |

## デプロイ前の準備

namespace の作成（初回のみ）:
```bash
kubectl create namespace gomi-no-hi
```

imagePullSecret はクラスタ管理者が事前に作成する。Secret 名を `registry.existingSecret` に指定する（デフォルト: `ghcr-secret`）。

## インストール・アップグレード

### 開発環境（チャートが Secret を作成）

```bash
op run --env-file=../.env.1password -- helm upgrade --install gomi-no-hi ./helm/gomi-no-hi \
  -n gomi-no-hi \
  --set frontend.image.repository=<frontendイメージ> \
  --set backend.image.repository=<backendイメージ> \
  --set backend.vapid.publicKey="$VAPID_PUBLIC_KEY" \
  --set backend.vapid.privateKey="$VAPID_PRIVATE_KEY" \
  --set backend.vapid.subject="$VAPID_SUBJECT" \
  --set redis.auth.password="$REDIS_PASSWORD"
```

### 本番環境（既存 Secret を参照）

```bash
helm upgrade --install gomi-no-hi ./helm/gomi-no-hi \
  -n gomi-no-hi \
  --set frontend.image.repository=<frontendイメージ> \
  --set backend.image.repository=<backendイメージ> \
  --set frontend.image.tag=v1.2.0 \
  --set backend.image.tag=v1.2.0 \
  --set backend.existingSecret=<backend-secret名> \
  --set redis.auth.existingSecret=<redis-secret名> \
  --set registry.existingSecret=<imagePullSecret名>
```

## テンプレート確認

```bash
helm template gomi-no-hi ./helm/gomi-no-hi -n gomi-no-hi \
  --set frontend.image.repository=example/frontend \
  --set backend.image.repository=example/backend
helm lint ./helm/gomi-no-hi
```

## 注意事項

- Ingress はクラスタ管理層が担当。chart には含まない
- VAPID キー変更時は `checksum/secret` アノテーションにより backend Pod が自動再起動する
- Redis は単一インスタンス（AOF 有効）。高可用性が必要な場合は Redis Sentinel を検討
