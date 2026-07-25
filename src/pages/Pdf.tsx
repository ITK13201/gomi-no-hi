export function Pdf() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <header className="bg-green-600 text-white safe-top flex-none">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold">収集カレンダー</h1>
        </div>
      </header>
      <main className="flex-1 overflow-hidden pb-nav">
        <iframe src="/calendar.pdf" className="w-full h-full" title="収集カレンダー PDF" />
      </main>
    </div>
  )
}
