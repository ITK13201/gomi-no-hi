output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.subscriptions.id
  description = "KV namespace ID（wrangler.toml の dev 用設定に使用）"
}

output "pages_subdomain" {
  value       = cloudflare_pages_project.app.subdomain
  description = "Pages のデプロイ URL"
}

output "workers_script_name" {
  value       = cloudflare_workers_script.api.script_name
  description = "Workers スクリプト名"
}

output "custom_domain" {
  value       = cloudflare_pages_domain.custom.name
  description = "独自ドメイン"
}
