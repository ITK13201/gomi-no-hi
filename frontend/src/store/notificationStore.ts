import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NotificationStore = {
  enabled: boolean
  eveningHour: number
  morningHour: number
  permission: NotificationPermission
  setEnabled: (enabled: boolean) => void
  setEveningHour: (hour: number) => void
  setMorningHour: (hour: number) => void
  setPermission: (permission: NotificationPermission) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      enabled: false,
      eveningHour: 20,
      morningHour: 7,
      permission: 'default' as NotificationPermission,
      setEnabled: (enabled) => set({ enabled }),
      setEveningHour: (eveningHour) => set({ eveningHour }),
      setMorningHour: (morningHour) => set({ morningHour }),
      setPermission: (permission) => set({ permission }),
    }),
    { name: 'notification-settings' },
  ),
)
