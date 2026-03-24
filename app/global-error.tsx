'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

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
          {error.digest && (
            <p className="mb-6 text-xs text-white/30 font-mono">
              Mã lỗi: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={reset}
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
