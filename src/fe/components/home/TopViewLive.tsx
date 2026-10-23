'use client'

// ============================================
// TopViewLive — realtime "đang thịnh hành" board
// ============================================
// Activity-ranked Top View board, shared with the admin dashboard:
//   live viewers → views today → all-time viewCount.
// SSR-seeded via `initial` so it paints instantly, then updates live over the
// socket (TOPVIEW_STATS) as people start/stop watching.

import Link from 'next/link'
import { Eye, Flame, Calendar } from 'lucide-react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useTopViewLive, type TopViewItem } from '@/src/fe/lib/realtime/hooks'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('vi-VN')
}

export function TopViewLive({ initial = [] }: { initial?: TopViewItem[] }) {
  const { user } = useAuth()
  const { items } = useTopViewLive(user?.id ?? null, initial)

  if (!items || items.length === 0) return null

  const totalLive = items.reduce((n, it) => n + (it.viewers || 0), 0)

  return (
    <section className="mb-10 rounded-2xl border border-white/[0.06] bg-card/40 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Flame className="h-5 w-5 text-red-400" />
          Đang thịnh hành
          {totalLive > 0 && (
            <span className="relative ml-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
        </h2>
        {totalLive > 0 && (
          <span className="text-xs font-medium text-white/50">
            {totalLive.toLocaleString('vi-VN')} người đang xem
          </span>
        )}
      </div>

      <ol className="space-y-2">
        {items.map((it) => (
          <li key={it.movieId}>
            <Link
              href={`/movie/${it.slug || it.movieId}`}
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
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.jpg' }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                {it.title}
              </span>

              {/* Live viewers (only when >0) → today → all-time */}
              <div className="flex shrink-0 items-center gap-1.5">
                {it.viewers > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400">
                    <Eye className="h-3.5 w-3.5" />
                    {fmt(it.viewers)}
                  </span>
                )}
                {it.viewsToday > 0 && (
                  <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary sm:flex" title="Lượt xem hôm nay">
                    <Calendar className="h-3.5 w-3.5" />
                    {fmt(it.viewsToday)}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/50" title="Tổng lượt xem">
                  {fmt(it.viewCount)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
