// ============================================
// TrendingRankings — 3-column ranking section
// ============================================
// Server Component: fetches data via Prisma (SSR) for optimal LCP.
// Sôi nổi nhất | Yêu thích nhất | Bình luận mới

import { TrendingUp, Play } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/fe/lib/logger'

const log = logger.child({ module: 'TrendingRankings' })

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
  createdAt: Date
  user: { id: string; name: string; avatar: string | null }
  movie: { id: string; title: string; slug: string }
}

export async function TrendingRankings() {
  let trending: RankedMovie[] = []
  let mostLiked: RankedMovie[] = []
  let recentReviews: RecentReview[] = []

  try {
    const [tMovies, lMovies, rReviews] = await Promise.all([
      prisma.movie.findMany({
        where: { isActive: true, isPublished: true, OR: [{ posterUrl: { not: null } }, { thumbUrl: { not: null } }] },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, posterUrl: true, thumbUrl: true, viewCount: true }
      }),
      prisma.movie.findMany({
        where: { isActive: true, isPublished: true, OR: [{ posterUrl: { not: null } }, { thumbUrl: { not: null } }] },
        orderBy: {
          favorites: { _count: 'desc' }
        },
        take: 5,
        select: { id: true, title: true, slug: true, posterUrl: true, thumbUrl: true, _count: { select: { favorites: true } } }
      }),
      prisma.review.findMany({
        where: { status: 'approved' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          movie: { select: { id: true, title: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    ])

    trending = tMovies.map((m, i) => ({ rank: i + 1, movie: { id: m.id, title: m.title, slug: m.slug, posterUrl: m.posterUrl || m.thumbUrl }, viewCount: m.viewCount }))
    mostLiked = lMovies.map((m, i) => ({ rank: i + 1, movie: { id: m.id, title: m.title, slug: m.slug, posterUrl: m.posterUrl || m.thumbUrl }, favoriteCount: m._count?.favorites || 0 }))
    recentReviews = rReviews
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'TrendingRankings fetch error')
  }

  const hasData = trending.length > 0 || mostLiked.length > 0 || recentReviews.length > 0
  if (!hasData) return null

  return (
    <section className="py-4">
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-white/[0.06]">
            {/* Col 1: Sôi nổi nhất */}
            <RankingColumn
              title="SÔI NỔI NHẤT"
              items={trending}
              moreHref="/browse?category=trending"
            />

            {/* Col 2: Yêu thích nhất */}
            <RankingColumn
              title="YÊU THÍCH NHẤT"
              items={mostLiked}
              moreHref="/browse?category=popular"
            />

            {/* Col 3: Bình luận mới */}
            <div className="md:pl-8">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                BÌNH LUẬN MỚI
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
      </div>
    </section>
  )
}

// ── Ranking Column (Sôi nổi / Yêu thích) ──
function RankingColumn({
  title,
  items,
  moreHref,
}: {
  title: string
  items: RankedMovie[]
  moreHref: string
}) {
  return (
    <div className="md:pr-8">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-white/30">Chưa có dữ liệu</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.movie.id}
              href={`/watch/${item.movie.id}`}
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
                  src={
                    !item.movie.posterUrl || item.movie.posterUrl === '/placeholder.jpg'
                    ? '/placeholder.jpg'
                    : item.movie.posterUrl.startsWith('http')
                    ? item.movie.posterUrl
                    : item.movie.posterUrl.startsWith('/uploads')
                    ? `https://phimimg.com${item.movie.posterUrl}`
                    : `https://image.tmdb.org/t/p/w185${item.movie.posterUrl}`
                  }
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
        <div className="flex justify-end mt-4">
          <Link
            href={moreHref}
            className="text-xs font-semibold text-primary/80 hover:text-primary transition flex items-center gap-1"
          >
            Xem thêm <TrendingUp className="h-3 w-3" />
          </Link>
        </div>
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
            href={`/watch/${review.movie.id}`}
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


