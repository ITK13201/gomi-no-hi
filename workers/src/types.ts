export type PushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export type StoredSubscription = PushSubscription & {
  morningHour: number
  eveningHour: number
  subscribedAt: string
}

export type Env = {
  KV: KVNamespace
  ALLOWED_IPS: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}
