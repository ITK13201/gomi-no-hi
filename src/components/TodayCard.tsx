import { WasteBadge } from './WasteBadge'
import type { WasteTypeId } from '../data/wasteTypes'

type Props = {
  label: string
  date: Date
  types: WasteTypeId[]
}

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

export function TodayCard({ label, date, types }: Props) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dow = DOW_JA[date.getDay()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm text-gray-500">
          {month}月{day}日
          <span className={`ml-1 ${isWeekend ? (date.getDay() === 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-500'}`}>
            ({dow})
          </span>
        </span>
      </div>
      {types.length === 0 ? (
        <p className="text-gray-400 text-sm">収集はありません</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <WasteBadge key={t} typeId={t} size="lg" />
          ))}
        </div>
      )}
    </div>
  )
}
