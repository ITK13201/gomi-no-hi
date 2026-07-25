export function Pdf() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <header className="bg-green-600 text-white safe-top flex-none">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">収集カレンダー</h1>
          <a
            href="/calendar.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/80 underline"
          >
            別タブで開く
          </a>
        </div>
      </header>
      <main className="flex-1 pb-nav" style={{ minHeight: 0 }}>
        <iframe
          src="/calendar.pdf"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="収集カレンダー PDF"
        />
      </main>
    </div>
  )
}
