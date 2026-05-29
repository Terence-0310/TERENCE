'use client'

import { useEffect, startTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home, FileCode2 } from 'lucide-react'

/**
 * Route-level error boundary — catches errors within content area.
 * Header/Footer remain visible, only the page content shows the error.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PageError]', error)
  }, [error])

  const router = useRouter()

  const handleReset = () => {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="h-9 w-9 text-red-400" />
      </div>
      <h1 className="mb-2 text-2xl font-black text-white">Có lỗi xảy ra</h1>
      <p className="mb-6 max-w-md text-sm text-white/60 leading-relaxed">
        Trang này gặp sự cố khi tải. Vui lòng thử lại hoặc quay về trang chủ.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 w-full max-w-2xl overflow-auto rounded-xl bg-red-950/50 p-4 text-left border border-red-500/20 custom-scrollbar max-h-[300px]">
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
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10"
        >
          <Home className="h-4 w-4" />
          Trang chủ
        </Link>
      </div>
    </main>
  )
}
