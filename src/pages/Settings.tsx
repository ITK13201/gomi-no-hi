import { useNotificationStore } from '../store/notificationStore'
import { REGION_CONFIG } from '../data/config'

declare const __APP_VERSION__: string

export function Settings() {
  const { enabled, eveningHour, morningHour, setEnabled, setEveningHour, setMorningHour } =
    useNotificationStore()

  async function handleToggleNotification() {
    if (!enabled) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setEnabled(true)
      }
    } else {
      setEnabled(false)
    }
  }

  const notificationSupported = 'Notification' in window

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white safe-top">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold">設定</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-nav space-y-4">
        {/* 地区情報 */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">地区情報</h2>
          </div>
          <div className="divide-y divide-gray-50">
            <SettingRow label="地区名" value={REGION_CONFIG.name} />
            <SettingRow
              label="カレンダー期間"
              value={`${REGION_CONFIG.calendarPeriod.start} 〜 ${REGION_CONFIG.calendarPeriod.end}`}
            />
            <SettingRow label="家庭ごみ問合せ" value={REGION_CONFIG.contact.general} />
            <SettingRow label="粗大ごみ予約" value={REGION_CONFIG.contact.bulky} />
          </div>
        </section>

        {/* 通知設定 */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">通知</h2>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">収集日通知</p>
                {!notificationSupported && (
                  <p className="text-xs text-red-400 mt-0.5">このブラウザは通知に対応していません</p>
                )}
              </div>
              <button
                onClick={handleToggleNotification}
                disabled={!notificationSupported}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
                  enabled ? 'bg-green-500' : 'bg-gray-200'
                }`}
                aria-checked={enabled}
                role="switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {enabled && (
              <>
                <TimeRow
                  label="前日夜の通知"
                  hour={eveningHour}
                  onChange={setEveningHour}
                />
                <TimeRow
                  label="当日朝の通知"
                  hour={morningHour}
                  onChange={setMorningHour}
                />
              </>
            )}
          </div>
        </section>

        {/* アプリ情報 */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">アプリ情報</h2>
          </div>
          <div className="divide-y divide-gray-50">
            <SettingRow label="アプリ名" value="ごみの日" />
            <SettingRow label="バージョン" value={`v${__APP_VERSION__}`} />
          </div>
        </section>
      </main>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 text-right max-w-[55%]">{value}</p>
    </div>
  )
}

function TimeRow({
  label,
  hour,
  onChange,
}: {
  label: string
  hour: number
  onChange: (h: number) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-gray-500">{label}</p>
      <select
        value={hour}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm font-medium text-gray-800 bg-gray-100 rounded-lg px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {i}:00
          </option>
        ))}
      </select>
    </div>
  )
}
