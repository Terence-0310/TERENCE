'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[WatchError]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h1 className="mb-2 text-xl font-bold text-white">Không thể phát video</h1>
      <p className="mb-6 max-w-md text-sm text-white/60">
        Nguồn video không khả dụng hoặc đã hết hạn. Hãy thử tải lại trang.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
      </div>
    </main>
  )
}
