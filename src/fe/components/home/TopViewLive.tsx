'use client'

// ============================================
// TopViewLive — realtime "đang xem nhiều nhất" leaderboard
// ============================================
// Subscribes to the live Top View feed (socket) and renders a ranked table
// of movies by current concurrent viewers. Updates as people start/stop
// watching. Hidden entirely when nobody is watching anything.

import Link from 'next/link'
import { Eye, Flame } from 'lucide-react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useTopViewLive } from '@/src/fe/lib/realtime/hooks'

export function TopViewLive() {
  const { user } = useAuth()
  const { items } = useTopViewLive(user?.id ?? null)

  if (!items || items.length === 0) return null

  const totalViewers = items.reduce((n, it) => n + it.viewers, 0)

  return (
    <section className="mb-10 rounded-2xl border border-white/[0.06] bg-card/40 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Flame className="h-5 w-5 text-red-400" />
          Đang xem nhiều nhất
          <span className="relative ml-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        </h2>
        <span className="text-xs font-medium text-white/50">
          {totalViewers.toLocaleString('vi-VN')} người đang xem
        </span>
      </div>

      <ol className="space-y-2">
        {items.map((it) => (
          <li key={it.movieId}>
            <Link
              href={`/watch/${it.slug}`}
              className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 transition hover:border-primary/20 hover:bg-white/[0.04]"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                  it.rank === 1
                    ? 'bg-yellow-400/20 text-yellow-300'
                    : it.rank === 2
                    ? 'bg-white/15 text-white/80'
                    : it.rank === 3
                    ? 'bg-orange-400/20 text-orange-300'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                {it.rank}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.posterUrl || it.thumbUrl || '/placeholder.jpg'}
                alt={it.title}
                className="h-12 w-9 shrink-0 rounded-md object-cover bg-white/5"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                {it.title}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400">
                <Eye className="h-3.5 w-3.5" />
                {it.viewers.toLocaleString('vi-VN')}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
