import Link from 'next/link'
import { Film } from 'lucide-react'

export default function MovieNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-white/5">
        <Film className="h-9 w-9 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-5xl font-black text-gradient">404</h1>
      <p className="mb-6 max-w-sm text-muted-foreground leading-relaxed">
        Bộ phim bạn tìm không tồn tại hoặc đã bị gỡ khỏi hệ thống.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
        >
          Trang chủ
        </Link>
        <Link
          href="/browse"
          className="rounded-xl bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10"
        >
          Khám phá phim
        </Link>
      </div>
    </main>
  )
}
