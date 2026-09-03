import { useState, useEffect, useRef } from 'react'
import { useNotificationStore } from '../store/notificationStore'

export function useNotification() {
  const { enabled, morningHour, eveningHour, permission, setEnabled, setPermission } =
    useNotificationStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)
  }, [setPermission])

  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    if (!enabled || permission !== 'granted' || !('serviceWorker' in navigator)) return
    void (async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return
      const subJSON = subscription.toJSON()
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint, keys: subJSON.keys, morningHour, eveningHour }),
      })
    })()
  }, [morningHour, eveningHour, enabled, permission])

  async function enable() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return

    setEnabled(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      const subJSON = subscription.toJSON()

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint, keys: subJSON.keys, morningHour, eveningHour }),
      })
      if (!res.ok) throw new Error(res.statusText)
      setError(null)
    } catch {
      setEnabled(false)
      setError('通知の登録に失敗しました。もう一度お試しください。')
    }
  }

  async function disable() {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
    }

    setEnabled(false)
  }

  function clearError() {
    setError(null)
  }

  return { enabled, permission, error, enable, disable, clearError }
}
