import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Guide } from './pages/Guide'
import { Settings } from './pages/Settings'

const Pdf = lazy(() => import('./pages/Pdf').then((m) => ({ default: m.Pdf })))

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/pdf" element={<Suspense><Pdf /></Suspense>} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
