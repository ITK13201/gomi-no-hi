import { useState, useMemo } from 'react'
import { WasteBadge } from '../components/WasteBadge'
import { useMonthSchedule } from '../hooks/useSchedule'
import { getCollectionTypes } from '../data/schedule'
import { WASTE_TYPES, WASTE_TYPE_LIST } from '../data/wasteTypes'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const collectionDays = useMonthSchedule(year, month)
  const collectionMap = useMemo(
    () => new Map(collectionDays.map((d) => [d.date, d.types])),
    [collectionDays],
  )

  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selectedTypes = selectedDate ? (getCollectionTypes(selectedDate) ?? []) : []

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white safe-top">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
            aria-label="前の月"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">
            {year}年{month}月
          </h1>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
            aria-label="次の月"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-nav">
        {/* 凡例 */}
        <div className="bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {WASTE_TYPE_LIST.map((w) => (
              <span
                key={w.id}
                className={`inline-flex items-center rounded-full border text-xs px-2 py-0.5 ${w.bgColor} ${w.textColor} ${w.borderColor}`}
              >
                {w.shortLabel}
              </span>
            ))}
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 bg-white border-b border-gray-100">
          {DOW_LABELS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 bg-white">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="border-b border-r border-gray-50 min-h-16" />
            }

            const dateStr = toDateStr(year, month, day)
            const types = collectionMap.get(dateStr) ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dow = (firstDow + day - 1) % 7

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`border-b border-r border-gray-50 min-h-16 p-1 text-left transition-colors ${
                  isSelected ? 'bg-green-50' : 'hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div
                  className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-green-600 text-white'
                      : dow === 0
                      ? 'text-red-500'
                      : dow === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
                <div className="flex flex-col gap-0.5">
                  {types.map((t) => (
                    <div
                      key={t}
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: WASTE_TYPES[t].color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* 選択日の詳細 */}
        {selectedDate && (
          <div className="mx-4 mt-4 rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              {parseInt(selectedDate.split('-')[1])}月{parseInt(selectedDate.split('-')[2])}日の収集
            </p>
            {selectedTypes.length === 0 ? (
              <p className="text-gray-400 text-sm">収集はありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTypes.map((t) => (
                  <WasteBadge key={t} typeId={t} size="lg" />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
