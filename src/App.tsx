import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Guide } from './pages/Guide'
import { Settings } from './pages/Settings'

// 起動後すぐにバックグラウンドで取得しておく（初回タップ時の Suspense を回避）
void import('./pages/Pdf')
const Pdf = lazy(() => import('./pages/Pdf').then((m) => ({ default: m.Pdf })))

function PdfSkeleton() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <header className="bg-green-600 text-white safe-top flex-none">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold">収集カレンダー</h1>
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-sm text-white/30">← 前</span>
          <span className="text-sm text-white/80" />
          <span className="text-sm text-white/30">次 →</span>
        </div>
      </header>
      <main className="flex-1 pb-nav bg-gray-100" style={{ minHeight: 0 }}>
        <p className="py-16 text-center text-sm text-gray-400">読み込み中...</p>
      </main>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/pdf" element={<Suspense fallback={<PdfSkeleton />}><Pdf /></Suspense>} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
