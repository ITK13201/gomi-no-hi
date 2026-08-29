import { useMemo } from 'react'
import { TodayCard } from '../components/TodayCard'
import { WeeklySchedule } from '../components/WeeklySchedule'
import { useTodaySchedule, useTomorrowSchedule, useWeekSchedule } from '../hooks/useSchedule'
import { REGION_CONFIG } from '../data/config'

export function Home() {
  const today = useMemo(() => new Date(), [])
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  }, [])

  const todayTypes = useTodaySchedule()
  const tomorrowTypes = useTomorrowSchedule()
  const weekDays = useWeekSchedule()

  const needsAttention = tomorrowTypes.length > 0

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white safe-top">
        <div className="px-4 pt-4 pb-3">
          <p className="text-green-200 text-xs font-medium">{REGION_CONFIG.name}</p>
          <h1 className="text-xl font-bold mt-0.5">ごみの日</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-nav space-y-4">
        {needsAttention && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="text-amber-500 text-lg">🔔</span>
            <p className="text-amber-800 text-sm font-medium">明日はごみの日です！朝8時までに出してください。</p>
          </div>
        )}

        <TodayCard label="今日" date={today} types={todayTypes} />
        <TodayCard label="明日" date={tomorrow} types={tomorrowTypes} />

        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
            今後7日間の収集
          </h2>
          <WeeklySchedule days={weekDays} />
        </section>
      </main>
    </div>
  )
}
