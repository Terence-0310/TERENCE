import Link from 'next/link'
import { Search, Home } from 'lucide-react'

/**
 * Global 404 page — shown for any route that doesn't exist.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-white/5">
        <Search className="h-9 w-9 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-5xl font-black text-gradient">404</h1>
      <p className="mb-2 text-xl font-bold text-white">Không tìm thấy trang</p>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          Trang chủ
        </Link>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10"
        >
          <Search className="h-4 w-4" />
          Khám phá phim
        </Link>
      </div>
    </main>
  )
}
