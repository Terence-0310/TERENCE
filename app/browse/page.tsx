import { searchMovies } from '@/services/tmdb/search-service'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByGenre, getMoviesByCountry, getGenres } from '@/services/tmdb/movie-service'
import { MovieCard } from '@/components/shared/MovieCard'
import { SearchBar } from '@/components/shared/SearchBar'
import Link from 'next/link'
import { Film, Search as SearchIcon } from 'lucide-react'
import type { Metadata } from 'next'
import type { Genre } from '@/types/movie'

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; category?: string; page?: string; country?: string }>
}

export const metadata: Metadata = {
  title: 'Khám phá phim — Terence',
  description: 'Tìm kiếm và khám phá kho phim phong phú trên Terence.',
}

const CATEGORY_LABELS: Record<string, string> = {
  trending: '🔥 Xu hướng',
  popular: '🎬 Phổ biến',
  'top-rated': '⭐ Đánh giá cao',
  'now-playing': '🍿 Đang chiếu',
  upcoming: '📅 Sắp ra mắt',
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q || ''
  const genreId = params.genre ? Number(params.genre) : null
  const category = params.category || ''
  const country = params.country || ''
  const page = Number(params.page) || 1

  let genres: Genre[] = []
  try { genres = await getGenres() } catch {}

  let result
  let title = 'Phim phổ biến'

  try {
    if (query) {
      result = await searchMovies(query, page)
      title = `Kết quả cho "${query}"`
    } else if (country) {
      result = await getMoviesByCountry(country, page)
      title = `Phim từ: ${country}`
    } else if (genreId) {
      result = await getMoviesByGenre(genreId, page)
      const gn = genres.find((g) => g.id === genreId)?.name || ''
      title = gn ? `Thể loại: ${gn}` : 'Thể loại phim'
    } else if (category === 'trending') {
      result = await getTrending(page)
    } else if (category === 'top-rated') {
      result = await getTopRated(page)
    } else if (category === 'now-playing') {
      result = await getNowPlaying(page)
    } else if (category === 'upcoming') {
      result = await getUpcoming(page)
    } else {
      result = await getPopular(page)
    }
    if (category && CATEGORY_LABELS[category]) title = CATEGORY_LABELS[category]
  } catch {
    result = { items: [], page: 1, totalPages: 0, totalResults: 0 }
  }

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams()
    if (query) sp.set('q', query)
    if (genreId) sp.set('genre', String(genreId))
    if (category) sp.set('category', category)
    if (p > 1) sp.set('page', String(p))
    return `/browse?${sp.toString()}`
  }

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-12">
      {/* Header area */}
      <div className="border-b border-white/[0.04] bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
          <SearchBar defaultValue={query} />

          {/* Genre chips */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/browse"
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition animate-chip-in ${
                  !genreId && !category
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
                }`}
                style={{ '--i': 0 } as React.CSSProperties}
              >
                Tất cả
              </Link>
              {genres.map((g, i) => (
                <Link
                  key={g.id}
                  href={`/browse?genre=${g.id}`}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition animate-chip-in ${
                    genreId === g.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
                  }`}
                  style={{ '--i': i + 1 } as React.CSSProperties}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        {/* Title + count */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white md:text-2xl animate-slide-in-left">{title}</h1>
          {result.totalResults > 0 && (
            <span className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground border border-white/5">
              {result.totalResults.toLocaleString()} phim
            </span>
          )}
        </div>

        {/* Grid */}
        {result.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {result.items.map((m, i) => (
              <div key={m.id} className="animate-card-reveal" style={{ '--i': i } as React.CSSProperties}>
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-white/5">
              {query ? (
                <SearchIcon className="h-7 w-7 text-muted-foreground" />
              ) : (
                <Film className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white/80">
              {query ? 'Không tìm thấy kết quả' : 'Chưa có phim nào'}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {query
                ? `Không có phim nào khớp với "${query}". Thử từ khóa khác hoặc duyệt theo thể loại.`
                : 'Vui lòng kiểm tra kết nối TMDB API.'}
            </p>
            <Link
              href="/browse"
              className="mt-5 rounded-lg bg-primary/10 px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              Xem tất cả phim
            </Link>
          </div>
        )}

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 border border-white/[0.06] transition hover:bg-white/10"
              >
                ← Trước
              </Link>
            )}

            {/* Page numbers */}
            <div className="hidden items-center gap-1 md:flex">
              {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2
                if (p < 1 || p > result.totalPages) return null
                return (
                  <Link
                    key={p}
                    href={buildPageUrl(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                      p === page
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </Link>
                )
              })}
            </div>

            <span className="text-xs text-muted-foreground md:hidden">
              {page} / {Math.min(result.totalPages, 500)}
            </span>

            {page < result.totalPages && page < 500 && (
              <Link
                href={buildPageUrl(page + 1)}
                className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 border border-white/[0.06] transition hover:bg-white/10"
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
