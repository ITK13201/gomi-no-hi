import { useMemo } from 'react'
import { getCollectionTypes, getCollectionDaysInMonth } from '../data/schedule'
import type { WasteTypeId } from '../data/wasteTypes'

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useTodaySchedule(): WasteTypeId[] {
  const today = useMemo(() => toDateStr(new Date()), [])
  return useMemo(() => getCollectionTypes(today), [today])
}

export function useTomorrowSchedule(): WasteTypeId[] {
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateStr(d)
  }, [])
  return useMemo(() => getCollectionTypes(tomorrow), [tomorrow])
}

export function useWeekSchedule() {
  return useMemo(() => {
    const today = new Date()
    const days: { date: Date; dateStr: string; types: WasteTypeId[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dateStr = toDateStr(d)
      const types = getCollectionTypes(dateStr)
      if (types.length > 0) {
        days.push({ date: d, dateStr, types })
      }
    }
    return days
  }, [])
}

export function useMonthSchedule(year: number, month: number) {
  return useMemo(() => getCollectionDaysInMonth(year, month), [year, month])
}
