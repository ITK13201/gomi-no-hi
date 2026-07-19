variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID (カスタムドメインのゾーン)"
}

variable "allowed_ip_addresses" {
  type        = list(string)
  description = "WAF・Workers で許可する IP アドレスのリスト"
}

variable "vapid_public_key" {
  type        = string
  description = "VAPID 公開鍵（base64url）"
}

variable "vapid_private_key" {
  type        = string
  sensitive   = true
  description = "VAPID 秘密鍵（base64url）"
}

variable "vapid_subject" {
  type        = string
  default     = "mailto:ti2236sh@gmail.com"
  description = "VAPID subject（mailto: または https:// URL）"
}
