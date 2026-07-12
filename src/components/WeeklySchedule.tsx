import { WasteBadge } from './WasteBadge'
import type { WasteTypeId } from '../data/wasteTypes'

type DayEntry = {
  date: Date
  dateStr: string
  types: WasteTypeId[]
}

type Props = {
  days: DayEntry[]
}

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

export function WeeklySchedule({ days }: Props) {
  if (days.length === 0) {
    return <p className="text-center text-gray-400 py-4 text-sm">今週の収集予定はありません</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {days.map(({ date, types }) => {
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dow = DOW_JA[date.getDay()]
        const isSun = date.getDay() === 0
        const isSat = date.getDay() === 6

        return (
          <div key={date.toISOString()} className="flex items-center gap-3 py-3">
            <div className="w-14 shrink-0 text-center">
              <div className="text-xs text-gray-400">
                {month}/{day}
              </div>
              <div
                className={`text-sm font-semibold ${
                  isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'
                }`}
              >
                ({dow})
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => (
                <WasteBadge key={t} typeId={t} size="sm" />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
