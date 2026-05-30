import Link from 'next/link'
import Image from 'next/image'
import { Eye, Trophy, Crown, Flame, Star } from 'lucide-react'
import type { Metadata } from 'next'
import type { Movie } from '@/types/movie'
import { prisma } from '@/src/be/shared/db/prisma'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'
import { TopViewLive } from '@/src/fe/components/home/TopViewLive'

export const metadata: Metadata = {
  title: 'Bảng Xếp Hạng Top View — Terence',
  description: 'Top những bộ phim có lượt xem cao nhất trên hệ thống Terence.',
}

const PER_PAGE = 24

// Only show movies that have at least one usable image source.
// Mock seed entries without a poster pollute the leaderboard otherwise.
const POSTER_FILTER = {
  OR: [
    { posterUrl: { not: null } },
    { thumbUrl: { not: null } },
    { tmdbId: { not: null } },
  ],
}

const LIST_WHERE = {
  isActive: true,
  isPublished: true,
  status: 'published',
  ...POSTER_FILTER,
}

const LIST_SELECT = {
  id: true, slug: true, title: true, originalTitle: true,
  contentType: true, year: true, quality: true,
  thumbUrl: true, posterUrl: true, rating: true,
  viewCount: true, tmdbId: true,
  genres: { include: { genre: { select: { name: true } } } },
} as const

type RankedMovie = Awaited<ReturnType<typeof fetchPage>>['movies'][number]

async function fetchPage(page: number) {
  const skip = (page - 1) * PER_PAGE
  const [movies, total, totalViews] = await Promise.all([
    prisma.movie.findMany({
      where: LIST_WHERE,
      select: LIST_SELECT,
      orderBy: [{ viewCount: 'desc' }, { rating: 'desc' }],
      skip,
      take: PER_PAGE,
    }),
    prisma.movie.count({ where: LIST_WHERE }),
    prisma.movie.aggregate({
      where: LIST_WHERE,
      _sum: { viewCount: true },
    }),
  ])
  return { movies, total, totalViews: totalViews._sum.viewCount ?? 0 }
}

function buildPosterUrl(m: RankedMovie): string {
  if (m.posterUrl) return m.posterUrl
  if (m.thumbUrl) return m.thumbUrl
  if (m.tmdbId) {
    const isTv = m.contentType === 'series' || m.contentType === 'tv'
    return `/api/tmdb-image/${m.tmdbId}?type=poster&isTv=${isTv}`
  }
  return '/placeholder.jpg'
}

function movieHref(m: RankedMovie): string {
  const id = m.slug || m.id
  const isTv = m.contentType === 'series' || m.contentType === 'tv'
  return isTv ? `/tv/${id}` : `/movie/${id}`
}

function buildBackdropUrl(m: RankedMovie): string {
  if (m.tmdbId) {
    const isTv = m.contentType === 'series' || m.contentType === 'tv'
    return `/api/tmdb-image/${m.tmdbId}?type=backdrop&isTv=${isTv}`
  }
  return m.thumbUrl || m.posterUrl || '/placeholder.jpg'
}

// Map our DB record to the `Movie` shape MovieCard expects. Using
// MovieCard keeps the leaderboard visually identical to /movies and
// /series — same Netflix-style hover popup and rank rendering.
function toMovieCard(m: RankedMovie): Movie {
  const isTv = m.contentType === 'series' || m.contentType === 'tv'
  return {
    ...m,
    id: m.slug || m.id,
    posterUrl: buildPosterUrl(m),
    backdropUrl: buildBackdropUrl(m),
    year: m.year || 0,
    voteAverage: m.rating || 0,
    mediaType: isTv ? 'tv' : 'movie',
    genres: m.genres?.map((g) => ({ id: 0, name: g.genre.name })) ?? [],
  } as unknown as Movie
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('vi-VN')
}

const PODIUM_STYLES = {
  1: {
    badge: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-700 border-yellow-200 text-yellow-950',
    glow: 'shadow-[0_0_40px_-10px_rgba(234,179,8,0.55)] ring-2 ring-yellow-400/30',
    label: 'Hạng 1',
    accent: 'text-yellow-400',
  },
  2: {
    badge: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-slate-200 text-slate-900',
    glow: 'shadow-[0_0_40px_-10px_rgba(148,163,184,0.55)] ring-2 ring-slate-300/30',
    label: 'Hạng 2',
    accent: 'text-slate-300',
  },
  3: {
    badge: 'bg-gradient-to-br from-orange-300 via-orange-500 to-amber-800 border-orange-300 text-orange-950',
    glow: 'shadow-[0_0_40px_-10px_rgba(251,146,60,0.55)] ring-2 ring-orange-400/30',
    label: 'Hạng 3',
    accent: 'text-orange-400',
  },
} as const

function Podium({ movie, rank }: { movie: RankedMovie; rank: 1 | 2 | 3 }) {
  const style = PODIUM_STYLES[rank]
  const topGenre = movie.genres?.[0]?.genre?.name ?? null
  return (
    <Link
      href={movieHref(movie)}
      className={`group relative block overflow-hidden rounded-3xl border border-white/[0.06] bg-card transition-all duration-300 hover:-translate-y-1 ${style.glow}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          src={buildPosterUrl(movie)}
          alt={movie.title}
          fill
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px"
          priority={rank === 1}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

        <div className={`absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border-2 ${style.badge} px-3 py-1.5 shadow-xl`}>
          <Trophy className="h-4 w-4" />
          <span className="text-sm font-extrabold">{style.label}</span>
        </div>

        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-md border border-white/10">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-white">{formatCount(movie.viewCount ?? 0)}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-5">
          <h3 className="line-clamp-2 text-lg font-extrabold text-white md:text-xl">
            {movie.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {movie.year ? (
              <span className="text-white/60">{movie.year}</span>
            ) : null}
            {movie.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" />
                {movie.rating.toFixed(1)}
              </span>
            ) : null}
            {topGenre ? (
              <span className={`font-medium ${style.accent}`}>{topGenre}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}


export default async function TopViewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const { movies, total } = await fetchPage(page)
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const isFirstPage = page === 1
  const top3 = isFirstPage ? movies.slice(0, 3) : []
  const restMovies = isFirstPage ? movies.slice(3) : movies

  function buildPageUrl(p: number) {
    return `/top-view?page=${p}`
  }

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-12">

      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        {/* Realtime "đang xem nhiều nhất" — live concurrent viewers. */}
        <div className="pt-10">
          <TopViewLive />
        </div>

        {movies.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <Trophy className="mb-4 h-12 w-12 text-white/20" />
            <h2 className="text-lg font-semibold text-white/80">Chưa có dữ liệu lượt xem</h2>
            <p className="mt-2 text-sm text-white/40">Hệ thống đang tích lũy lượt xem cho các bộ phim.</p>
          </div>
        ) : (
          <>
            {/* ═══════ TOP 3 PODIUM (page 1 only) ═══════ */}
            {top3.length > 0 && (
              <section className="py-12">
                <div className="mb-6 flex items-center gap-3">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-xl font-bold tracking-tight text-white">Top 3 dẫn đầu</h2>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {top3.map((movie, i) => (
                    <Podium key={movie.id} movie={movie} rank={(i + 1) as 1 | 2 | 3} />
                  ))}
                </div>
              </section>
            )}

            {/* ═══════ REST OF GRID ═══════ */}
            {restMovies.length > 0 && (
              <section className="py-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                    <Flame className="h-5 w-5 text-orange-400" />
                    {isFirstPage ? 'Top phổ biến tiếp theo' : `Trang ${page}`}
                  </h2>
                  <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/40">
                    {isFirstPage
                      ? `Hạng ${4} → ${(page - 1) * PER_PAGE + movies.length}`
                      : `Hạng ${(page - 1) * PER_PAGE + 1} → ${(page - 1) * PER_PAGE + movies.length}`}
                  </span>
                </div>

                {/* Same grid + wrapper pattern as /movies & /series so cards
                    look identical (Netflix-style hover popup, rank label). */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {restMovies.map((movie, i) => {
                    const globalRank = (page - 1) * PER_PAGE + (isFirstPage ? i + 4 : i + 1)
                    return (
                      <div
                        key={movie.id}
                        className="animate-card-reveal relative hover:z-[60]"
                        style={{ '--i': i } as React.CSSProperties}
                      >
                        <MovieCard movie={toMovieCard(movie)} showRank={globalRank} />
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ═══════ PAGINATION ═══════ */}
        {totalPages > 1 && (
          <div className="mt-14 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="rounded-lg border border-white/[0.06] bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                ← Trước
              </Link>
            )}

            <div className="hidden items-center gap-1 md:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2
                if (p < 1 || p > totalPages) return null
                return (
                  <Link
                    key={p}
                    href={buildPageUrl(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                      p === page
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'border border-white/[0.06] bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </Link>
                )
              })}
            </div>

            <span className="text-xs text-white/40 md:hidden">
              {page} / {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={buildPageUrl(page + 1)}
                className="rounded-lg border border-white/[0.06] bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Sau →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
