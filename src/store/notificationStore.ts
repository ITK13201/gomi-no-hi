import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NotificationStore = {
  enabled: boolean
  eveningHour: number
  morningHour: number
  setEnabled: (enabled: boolean) => void
  setEveningHour: (hour: number) => void
  setMorningHour: (hour: number) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      enabled: false,
      eveningHour: 20,
      morningHour: 7,
      setEnabled: (enabled) => set({ enabled }),
      setEveningHour: (eveningHour) => set({ eveningHour }),
      setMorningHour: (morningHour) => set({ morningHour }),
    }),
    { name: 'notification-settings' },
  ),
)
