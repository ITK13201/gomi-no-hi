import { useEffect, useRef } from 'react'
import { useNotificationStore } from '../store/notificationStore'

export function useNotification() {
  const { enabled, morningHour, eveningHour, permission, setEnabled, setPermission } =
    useNotificationStore()

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
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, morningHour, eveningHour }),
      })
    })()
  }, [morningHour, eveningHour, enabled, permission])

  async function enable() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return

    setEnabled(true)

    const registration = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    })

    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, morningHour, eveningHour }),
    })
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

  return { enabled, permission, enable, disable }
}
