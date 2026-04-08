'use client'

// ============================================
// TrendingRankings — 3-column ranking section
// ============================================
// RoPhim-style: "Sôi nổi nhất" | "Yêu thích nhất" | "Bình luận mới"
// Fetches 3 API endpoints in parallel.
// Handles: loading, error, empty states (Frontend Rule #5)

import { useState, useEffect } from 'react'
import { TrendingUp, Play } from 'lucide-react'
import Link from 'next/link'

interface RankedMovie {
  rank: number
  movie: { id: string; title: string; slug: string; posterUrl: string | null }
  viewCount?: number
  favoriteCount?: number
}

interface RecentReview {
  id: string
  content: string | null
  rating: number
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
  movie: { id: string; title: string; slug: string }
}

export function TrendingRankings() {
  const [trending, setTrending] = useState<RankedMovie[]>([])
  const [mostLiked, setMostLiked] = useState<RankedMovie[]>([])
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/v1/movies/trending-stats').then((r) => r.json()),
      fetch('/api/v1/movies/most-liked').then((r) => r.json()),
      fetch('/api/v1/reviews/recent').then((r) => r.json()),
    ])
      .then(([t, l, r]) => {
        if (t.status === 'fulfilled' && t.value.success) setTrending(t.value.data || [])
        if (l.status === 'fulfilled' && l.value.success) setMostLiked(l.value.data || [])
        if (r.status === 'fulfilled' && r.value.success) setRecentReviews(r.value.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Don't render if all empty and not loading
  const hasData = trending.length > 0 || mostLiked.length > 0 || recentReviews.length > 0
  if (!loading && !hasData) return null

  return (
    <section className="py-4">
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        {loading ? (
          <RankingSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-white/[0.06]">
            {/* Col 1: Sôi nổi nhất */}
            <RankingColumn
              icon="🔥"
              title="SÔI NỔI NHẤT"
              items={trending}
              moreHref="/browse?category=trending"
            />

            {/* Col 2: Yêu thích nhất */}
            <RankingColumn
              icon="💝"
              title="YÊU THÍCH NHẤT"
              items={mostLiked}
              moreHref="/browse?category=popular"
            />

            {/* Col 3: Bình luận mới */}
            <div className="md:pl-8">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>⚡</span> BÌNH LUẬN MỚI
              </h3>
              <div className="space-y-3">
                {recentReviews.length === 0 ? (
                  <p className="text-sm text-white/30">Chưa có bình luận</p>
                ) : (
                  recentReviews.map((review) => (
                    <RecentReviewItem key={review.id} review={review} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Ranking Column (Sôi nổi / Yêu thích) ──
function RankingColumn({
  icon,
  title,
  items,
  moreHref,
}: {
  icon: string
  title: string
  items: RankedMovie[]
  moreHref: string
}) {
  return (
    <div className="md:pr-8">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-white/30">Chưa có dữ liệu</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.movie.id}
              href={`/movie/${item.movie.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 rank-item group"
            >
              {/* Rank number */}
              <span className="w-5 text-center text-sm font-bold text-white/40">
                {item.rank}.
              </span>

              {/* Trend icon */}
              <TrendingUp className="h-3.5 w-3.5 text-primary/60 shrink-0" />

              {/* Thumbnail */}
              {item.movie.posterUrl && (
                <img
                  src={item.movie.posterUrl}
                  alt={item.movie.title}
                  className="h-8 w-8 rounded object-cover border border-white/10 shrink-0"
                />
              )}

              {/* Title */}
              <span className="text-sm text-white/70 group-hover:text-white transition truncate">
                {item.movie.title}
              </span>
            </Link>
          ))
        )}
      </div>
      {items.length > 0 && (
        <Link
          href={moreHref}
          className="mt-3 inline-block text-xs text-white/40 hover:text-white/70 transition"
        >
          Xem thêm
        </Link>
      )}
    </div>
  )
}

// ── Recent Review Item (Bình luận mới) ──
function RecentReviewItem({ review }: { review: RecentReview }) {
  const initial = review.user.name.charAt(0).toUpperCase()

  return (
    <div className="rounded-lg px-2 py-2.5 rank-item">
      {/* User + comment */}
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 overflow-hidden">
          {review.user.avatar ? (
            <img src={review.user.avatar} alt={review.user.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/70">
            <span className="font-bold text-white">{review.user.name}</span>
            {' '}
            <span className="text-white/40">{review.content ? review.content.substring(0, 60) : ''}{(review.content?.length || 0) > 60 ? '...' : ''}</span>
          </p>
          <Link
            href={`/movie/${review.movie.id}`}
            className="mt-0.5 flex items-center gap-1 text-xs text-white/30 hover:text-primary transition"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            {review.movie.title}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──
function RankingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3].map((col) => (
        <div key={col} className="space-y-3">
          <div className="h-4 w-32 skeleton rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-3 w-5 skeleton rounded" />
              <div className="h-8 w-8 skeleton rounded" />
              <div className="h-3 flex-1 skeleton rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
