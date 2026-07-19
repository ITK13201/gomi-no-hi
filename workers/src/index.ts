import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { handleCron } from './cron'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors({ origin: '*', allowMethods: ['POST', 'DELETE', 'OPTIONS'] }))

app.use('/api/*', async (c, next) => {
  const clientIP = c.req.header('CF-Connecting-IP') ?? ''
  const allowed = c.env.ALLOWED_IPS.split(',').map((ip) => ip.trim())
  if (clientIP && !allowed.includes(clientIP)) {
    return c.text('Forbidden', 403)
  }
  await next()
})

async function subscriptionKey(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sub:${hex.slice(0, 16)}`
}

app.post('/api/subscribe', async (c) => {
  const body = await c.req.json<{
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
    morningHour: number
    eveningHour: number
  }>()
  const key = await subscriptionKey(body.subscription.endpoint)
  await c.env.KV.put(
    key,
    JSON.stringify({
      ...body.subscription,
      morningHour: body.morningHour,
      eveningHour: body.eveningHour,
      subscribedAt: new Date().toISOString(),
    }),
  )
  return c.text('Created', 201)
})

app.delete('/api/subscribe', async (c) => {
  const body = await c.req.json<{ endpoint: string }>()
  const key = await subscriptionKey(body.endpoint)
  await c.env.KV.delete(key)
  return c.text('OK')
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env))
  },
}
