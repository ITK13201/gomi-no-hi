import type { Env, StoredSubscription } from './types'
import { sendWebPush } from './webpush'
import { getCollectionTypes } from './schedule'

const WASTE_LABELS: Record<string, string> = {
  burnable: '燃えるごみ',
  nonBurnable: '燃えないごみ',
  paper: '古紙類',
  petBottle: 'ペットボトル',
  bottle: 'びん',
  can: '缶',
  oldClothes: '古着類',
  whiteTray: '白色トレイ',
  hazardous: '危険ごみ',
}

function formatTypes(types: string[]): string {
  return types.map((t) => WASTE_LABELS[t] ?? t).join('・')
}

function toJSTDateStr(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  const date = new Date(`${dateStr}T00:00:00+09:00`)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${Number(m)}/${Number(d)}・${days[date.getDay()]}`
}

export async function handleCron(env: Env): Promise<void> {
  const now = new Date()
  const jstHour = (now.getUTCHours() + 9) % 24

  const todayStr = toJSTDateStr(now)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = toJSTDateStr(tomorrow)

  const { keys } = await env.KV.list({ prefix: 'sub:' })

  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }

  await Promise.allSettled(
    keys.map(async ({ name }) => {
      const raw = await env.KV.get(name)
      if (!raw) return
      const sub = JSON.parse(raw) as StoredSubscription

      let notification: { title: string; body: string } | null = null

      if (jstHour === sub.morningHour) {
        const types = getCollectionTypes(todayStr)
        if (types.length > 0) {
          notification = {
            title: 'ごみの日のお知らせ',
            body: `今日（${formatDateLabel(todayStr)}）は${formatTypes(types)}の日です`,
          }
        }
      } else if (jstHour === sub.eveningHour) {
        const types = getCollectionTypes(tomorrowStr)
        if (types.length > 0) {
          notification = {
            title: 'ごみの日のお知らせ',
            body: `明日（${formatDateLabel(tomorrowStr)}）は${formatTypes(types)}の日です`,
          }
        }
      }

      if (!notification) return

      try {
        await sendWebPush(sub, notification, vapid)
        console.log(`push sent: ${name}`)
      } catch (err) {
        if (err instanceof Error && err.message.includes('410')) {
          // 410 Gone = subscription expired → delete
          await env.KV.delete(name)
          console.log(`subscription deleted (410): ${name}`)
        } else {
          console.error(`push failed for ${name}:`, err)
        }
      }
    }),
  )
}
