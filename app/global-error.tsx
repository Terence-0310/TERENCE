'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, FileCode2 } from 'lucide-react'

/**
 * Global error boundary — catches ALL unhandled errors in the root layout.
 * This is the LAST line of defense; the app will never show a blank crash screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  const handleReset = () => {
    reset()
    window.location.reload()
  }

  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#060912] text-white font-sans antialiased flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-9 w-9 text-red-400" />
          </div>
          <h1 className="mb-2 text-3xl font-black text-white">Đã xảy ra lỗi</h1>
          <p className="mb-8 text-white/60 leading-relaxed">
            Ứng dụng gặp sự cố không mong muốn. Đội ngũ kỹ thuật đã được thông báo. 
            Vui lòng thử lại hoặc quay về trang chủ.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 w-full max-w-3xl mx-auto overflow-auto rounded-xl bg-red-950/50 p-4 text-left border border-red-500/20 custom-scrollbar max-h-[400px]">
              <div className="flex items-center gap-2 mb-2 text-red-400">
                <FileCode2 className="w-4 h-4" />
                <span className="font-mono text-sm font-bold">{error.name}: {error.message}</span>
              </div>
              <pre className="font-mono text-xs text-red-400/80 whitespace-pre-wrap">{error.stack}</pre>
            </div>
          )}

          {error.digest && process.env.NODE_ENV !== 'development' && (
            <p className="mb-6 text-xs text-white/30 font-mono">
              Mã lỗi: {error.digest}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
