# terraform/

Cloudflare インフラ全体を管理する Terraform コード。provider: `cloudflare/cloudflare ~> 5.22`。

**コードを書く・編集する前に必ず `.mcp.json` の Terraform MCP server でリソース仕様を確認すること。**

## リソース構成

| リソース | 種別 | 用途 |
|---|---|---|
| `cloudflare_workers_kv_namespace.subscriptions` | KV | push 購読データ保存 |
| `cloudflare_workers_script.api` | Workers | Push 通知 API（`workers/dist/index.js`） |
| `cloudflare_workers_cron_trigger.hourly` | Cron | 毎時（UTC）通知送信 |
| `cloudflare_pages_project.app` | Pages | PWA ホスティング（GitHub 連携） |
| `cloudflare_pages_domain.custom` | Pages Domain | 独自ドメイン紐付け |
| `cloudflare_dns_record.pages_cname` | DNS CNAME | 独自ドメイン → *.pages.dev |
| `cloudflare_ruleset.ip_allowlist` | WAF | IP 許可リスト（zone レベル） |

## デプロイ手順

```bash
# Workers をビルドしてから apply する
cd workers && npm run build && cd ..
op run --env-file=.env.1password -- terraform apply
```

state は Cloudflare R2 に保存（S3 互換バックエンド）。

```bash
# 初回 or backend.hcl 変更時
op run --env-file=.env.1password -- terraform init -backend-config=backend.hcl
```

## シークレット管理

シークレットは 1Password（vault: `Development`）で管理し、`op run` でインジェクトする。

| 1Password item | field | 対応 TF 変数 |
|---|---|---|
| `gomi-no-hi-cloudflare` | `api_token` | `cloudflare_api_token` |
| `gomi-no-hi-cloudflare` | `account_id` | `account_id` |
| `gomi-no-hi-cloudflare` | `zone_id` | `zone_id` |
| `gomi-no-hi-cloudflare` | `r2_access_key_id` | `AWS_ACCESS_KEY_ID` |
| `gomi-no-hi-cloudflare` | `r2_secret_access_key` | `AWS_SECRET_ACCESS_KEY` |
| `gomi-no-hi-vapid` | `public_key` | `vapid_public_key` |
| `gomi-no-hi-vapid` | `private_key` | `vapid_private_key` |

非シークレット変数（`allowed_ip_addresses`・`custom_domain`）は `terraform.tfvars`（gitignore 済み）に記載。

## IP 制限（WAF）

`allowed_ip_addresses` に IPv4 と IPv6 の両方を指定すること。

```hcl
allowed_ip_addresses = [
  "xxx.xxx.xxx.xxx",       # 自宅 IPv4
  "xxxx:xxxx:xxxx:xxxx::/64",  # 自宅 IPv6（/64 プレフィックス）
]
```

**IPv6 の注意点:**
- 同一 LAN 内でもデバイスごとにアドレスが異なるため /64 プレフィックスで指定する
- ISP から割り当てられるプレフィックスが変わった場合は `terraform.tfvars` を更新して再 apply が必要
- 管理が煩雑な場合は Cloudflare ダッシュボード → Network → **IPv6 Compatibility をオフ**にすると IPv4 のみで接続される

## API トークンの権限

```
Account
  ├─ Workers KV Storage : Edit
  ├─ Workers Scripts    : Edit
  └─ Cloudflare Pages   : Edit

Zone（対象ドメインのみ）
  ├─ DNS            : Edit
  ├─ Zone WAF       : Edit
  └─ Workers Routes : Edit
```

## Terraform v5 構文の注意点

- `cloudflare_workers_script` の `bindings` はリスト形式（`[{ name=..., type=..., ... }]`）
- `cloudflare_workers_cron_trigger` の `schedules` は `[{ cron = "..." }]`
- `cloudflare_pages_project` の `deployment_configs` は `production` と `preview` 両方に `fail_open` を同じ値で設定すること
- `cloudflare_dns_record`（v5 でのリソース名。v4 の `cloudflare_record` は存在しない）
- S3 バックエンドの `backend.hcl` では `endpoint`（文字列）を使う。`endpoints = { s3 = ... }` はファイル内では使えない
