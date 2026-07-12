import { useState } from 'react'
import { WASTE_TYPE_LIST } from '../data/wasteTypes'

export function Guide() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white safe-top">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold">分別ガイド</h1>
          <p className="text-green-200 text-xs mt-0.5">出し方・注意事項</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-nav space-y-2">
        {WASTE_TYPE_LIST.map((waste) => {
          const isOpen = openId === waste.id
          return (
            <div
              key={waste.id}
              className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-4 text-left"
                onClick={() => setOpenId(isOpen ? null : waste.id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border text-sm font-medium px-3 py-1 ${waste.bgColor} ${waste.textColor} ${waste.borderColor}`}
                  >
                    {waste.label}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`size-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      出し方
                    </p>
                    <p className="text-sm text-gray-700">{waste.container}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      注意事項
                    </p>
                    <ul className="space-y-1">
                      {waste.notes.map((note) => (
                        <li key={note} className="flex items-start gap-1.5 text-sm text-gray-700">
                          <span className="text-green-500 mt-0.5">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">ごみ出しの基本ルール</p>
          <ul className="space-y-1 text-xs">
            <li>• 収集日の朝8時までに出してください</li>
            <li>• ペットボトル・缶・びん・白色トレイは袋に入れずカゴへ</li>
            <li>• 古紙は品目ごとにひもでしばる</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
