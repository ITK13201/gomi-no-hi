# ── KV Namespace ──────────────────────────────────────────────────────────────
resource "cloudflare_workers_kv_namespace" "subscriptions" {
  account_id = var.account_id
  title      = "gomi-no-hi-subscriptions"
}

# ── Workers Script ────────────────────────────────────────────────────────────
resource "cloudflare_workers_script" "api" {
  account_id     = var.account_id
  script_name    = "gomi-no-hi-api"
  content_file   = "${path.module}/../workers/dist/index.js"
  content_sha256 = filesha256("${path.module}/../workers/dist/index.js")
  main_module    = "index.js"

  bindings = [
    {
      name         = "KV"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.subscriptions.id
    },
    {
      name = "ALLOWED_IPS"
      type = "plain_text"
      text = join(",", var.allowed_ip_addresses)
    },
    {
      name = "VAPID_PUBLIC_KEY"
      type = "plain_text"
      text = var.vapid_public_key
    },
    {
      name = "VAPID_PRIVATE_KEY"
      type = "secret_text"
      text = var.vapid_private_key
    },
    {
      name = "VAPID_SUBJECT"
      type = "plain_text"
      text = var.vapid_subject
    },
  ]
}

# ── Cron Trigger ──────────────────────────────────────────────────────────────
resource "cloudflare_workers_cron_trigger" "hourly" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.api.script_name

  schedules = [
    { cron = "0 * * * *" }
  ]
}

# ── Pages Project ─────────────────────────────────────────────────────────────
resource "cloudflare_pages_project" "app" {
  account_id        = var.account_id
  name              = "gomi-no-hi"
  production_branch = "main"

  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
  }

  deployment_configs = {
    production = {
      fail_open = false
      env_vars = {
        VITE_VAPID_PUBLIC_KEY = {
          type  = "plain_text"
          value = var.vapid_public_key
        }
      }
    }
    preview = {
      fail_open = false
    }
  }
}

# ── Custom Domain ─────────────────────────────────────────────────────────────
resource "cloudflare_pages_domain" "custom" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.app.name
  name         = var.custom_domain
}

resource "cloudflare_dns_record" "pages_cname" {
  zone_id = var.zone_id
  name    = var.custom_domain
  type    = "CNAME"
  content = cloudflare_pages_project.app.subdomain
  proxied = true
  ttl     = 1
}

# ── WAF Custom Rule（IP 許可リスト）──────────────────────────────────────────
resource "cloudflare_ruleset" "ip_allowlist" {
  zone_id     = var.zone_id
  name        = "IP Allowlist"
  description = "Allow only specified IP addresses"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [
    {
      action      = "block"
      description = "Block requests from non-allowlisted IPs"
      enabled     = true
      expression  = "not ip.src in {${join(" ", var.allowed_ip_addresses)}}"
    }
  ]
}
