import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export function Pdf() {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <header className="bg-green-600 text-white safe-top flex-none">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold">収集カレンダー</h1>
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={numPages === 0 || pageNumber <= 1}
            className="text-white disabled:text-white/30 text-sm font-medium"
          >
            ← 前
          </button>
          <span className="text-sm text-white/80">
            {numPages > 0 ? `${pageNumber} / ${numPages}` : ''}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={numPages === 0 || pageNumber >= numPages}
            className="text-white disabled:text-white/30 text-sm font-medium"
          >
            次 →
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-nav bg-gray-100" style={{ minHeight: 0 }}>
        <Document
          file="/calendar.pdf"
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <p className="py-16 text-center text-sm text-gray-400">読み込み中...</p>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={window.innerWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </main>
    </div>
  )
}
