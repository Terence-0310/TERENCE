import { getMovieList } from '@/src/be/modules/movies/movie-service'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'
import Link from 'next/link'
import { TrendingUp, Eye, Trophy, Crown } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bảng Xếp Hạng Top View — Terence',
  description: 'Top những bộ phim có lượt xem cao nhất trên hệ thống Terence.',
}

export default async function TopViewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Number(params.page) || 1
  
  const { movies, total } = await getMovieList({ sort: 'popular', page, perPage: 24 })
  const totalPages = Math.ceil(total / 24)

  function buildPageUrl(p: number) {
    return `/top-view?page=${p}`
  }

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden border-b border-white/[0.04] bg-[#0A0D15]/80 py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-50"></div>
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]"></div>
        
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 lg:px-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-500/10 px-4 py-1.5 border border-orange-500/20">
            <TrendingUp className="mr-2 h-4 w-4 text-orange-400" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-orange-400">Bảng Xếp Hạng Lượt Xem</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight animate-slide-in-up">
            Phim Top View Điểm Cao
          </h1>
          <p className="mt-4 max-w-2xl text-white/50 text-[15px] animate-slide-in-up" style={{ animationDelay: '100ms' }}>
            Khám phá ngay danh sách những bộ phim gây bão và thu hút lượng người xem lớn nhất trên hệ thống cập nhật liên tục mỗi ngày.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Top Phổ Biến
          </h2>
          <span className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-white/40 border border-white/5">
            {total.toLocaleString()} phim
          </span>
        </div>

        {/* Grid */}
        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 relative">
            {movies.map((rawM: any, i: number) => {
              const globalRank = (page - 1) * 24 + i + 1;
              const isTop3 = globalRank <= 3;
              
              const isTv = rawM.contentType === 'series' || rawM.contentType === 'tv';
              const tmdbPosterUrl = rawM.tmdbId ? `/api/tmdb-image/${rawM.tmdbId}?type=poster&isTv=${isTv}` : null;
              const tmdbBackdropUrl = rawM.tmdbId ? `/api/tmdb-image/${rawM.tmdbId}?type=backdrop&isTv=${isTv}` : null;
              
              const m = {
                ...rawM,
                id: rawM.slug || rawM.id,
                title: rawM.title,
                originalTitle: rawM.originalTitle || rawM.title,
                posterUrl: tmdbPosterUrl || rawM.posterUrl || rawM.thumbUrl,
                backdropUrl: tmdbBackdropUrl || rawM.thumbUrl || rawM.posterUrl,
                year: rawM.year || 0,
                voteAverage: rawM.rating || 0,
                mediaType: isTv ? 'tv' : 'movie',
              }
              
              return (
                <div key={m.id} className="relative animate-card-reveal group" style={{ '--i': i } as React.CSSProperties}>
                  {/* Rank Badge */}
                  <div className={`absolute -top-3 -left-3 z-20 flex h-9 w-9 items-center justify-center rounded-full shadow-lg border-2 ${
                    globalRank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 border-yellow-200 text-yellow-950' : 
                    globalRank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 border-slate-200 text-slate-900' :
                    globalRank === 3 ? 'bg-gradient-to-br from-orange-400 to-amber-700 border-orange-300 text-orange-950' :
                    'bg-[#1A1D24] border-white/10 text-white/70'
                  }`}>
                    {isTop3 ? <Trophy className="h-4 w-4" /> : <span className="text-[13px] font-bold">{globalRank}</span>}
                  </div>
                  
                  {/* Card wrapper to add glow for top 3 */}
                  <div className="h-full w-full rounded-xl transition-all duration-300 relative">
                    {/* View Count Overlay on Poster */}
                    <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
                       <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/80 px-2 py-1 backdrop-blur-md border border-white/10">
                          <Eye className="h-3 w-3 text-primary" />
                          <span className="text-[11px] font-bold text-white shrink-0">
                            {m.viewCount?.toLocaleString() || 0} lượt xem
                          </span>
                       </div>
                    </div>
                    
                    <MovieCard movie={m as any} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Trophy className="mb-4 h-12 w-12 text-white/20" />
            <h2 className="text-lg font-semibold text-white/80">Chưa có dữ liệu lượt xem</h2>
            <p className="mt-2 text-sm text-white/40">Hệ thống đang tích lũy lượt xem cho các bộ phim.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-14 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 border border-white/[0.06] transition hover:bg-white/10"
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
                        : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10'
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
