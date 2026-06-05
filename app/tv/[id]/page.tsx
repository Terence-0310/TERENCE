import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, Calendar, Play, ArrowLeft, Tv, Clock } from 'lucide-react'
import { getTvDetail, getSeasonDetail } from '@/src/be/services/tmdb/tv-service'
import { MovieComments } from '@/src/fe/components/shared/MovieComments'
import { RelatedNews } from '@/src/fe/components/news/RelatedNews'
import { PageViewTracker } from '@/src/fe/components/analytics/PageViewTracker'
import { prisma } from '@/src/be/shared/db/prisma'
import { generateSlug } from '@/src/be/modules/admin/validators'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}

/**
 * Lazy-create a Movie row from TMDB tv detail when one doesn't exist yet.
 * The catalog only seeds movies from OPhim sync; TMDB-only series otherwise
 * have no DB record, which breaks anything that joins reviews/likes by Movie
 * id. Idempotent — once created the row is found on subsequent renders.
 */
async function ensureTmdbSeriesMovie(series: Awaited<ReturnType<typeof getTvDetail>>) {
  const existing = await prisma.movie.findFirst({ where: { tmdbId: series.id } })
  if (existing) return existing

  // Ensure a unique slug — append the tmdbId if the base slug collides.
  const base = generateSlug(series.title) || `series-${series.id}`
  let slug = base
  if (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${base}-${series.id}`
  }

  let created
  try {
    created = await prisma.movie.create({
      data: {
        tmdbId: series.id,
        slug,
        title: series.title,
        originalTitle: series.originalTitle || null,
        description: series.overview || null,
        contentType: 'series',
        year: series.year > 0 ? series.year : null,
        posterUrl: series.posterUrl || null,
        backdropUrl: series.backdropUrl || null,
        rating: series.voteAverage || 0,
        isActive: true,
        isPublished: true,
        status: 'published',
        metadataSource: 'tmdb',
      },
    })
  } catch {
    // Race: another request may have created the row between our findFirst
    // and create. Re-read and return whatever's there.
    created = await prisma.movie.findFirst({ where: { tmdbId: series.id } })
  }

  // Fire-and-forget Elasticsearch index push so newly-persisted titles are
  // searchable immediately (instead of waiting for the 2 AM reindex cron).
  if (created?.id) {
    const movieId = created.id
    import('@/src/be/modules/search/movie-search-indexer')
      .then(({ indexMovie }) => indexMovie(movieId))
      .catch(() => {})
  }

  return created
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const series = await getTvDetail(Number(id))
    return {
      title: `${series.title} (${series.year}) — Terence`,
      description: series.overview?.slice(0, 155) || `Xem ${series.title} trên Terence`,
      openGraph: {
        title: `${series.title} — Terence`,
        description: series.overview || '',
        images: series.backdropUrl ? [{ url: series.backdropUrl, width: 1280, height: 720 }] : [],
      },
    }
  } catch {
    return { title: 'Phim Bộ — Terence' }
  }
}

export default async function SeriesDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { season: seasonParam } = await searchParams

  if (isNaN(Number(id))) {
    const { redirect } = await import('next/navigation')
    redirect(`/watch/${id}`)
  }

  const seriesId = Number(id)

  let series
  try {
    series = await getTvDetail(seriesId)
  } catch {
    notFound()
  }

  const creators = series.creators || []

  // ── Selected season for the inline episode list ──
  // Default to season 1 (or the first non-special season). Switching is via
  // the ?season=N query param so the page stays a clean server component.
  const playableSeasons = (series.seasons || []).filter((s) => s.seasonNumber > 0)
  const fallbackSeasonNumber = playableSeasons[0]?.seasonNumber ?? 1
  const selectedSeasonNumber = Number(seasonParam) > 0 ? Number(seasonParam) : fallbackSeasonNumber
  const selectedSeason = await getSeasonDetail(seriesId, selectedSeasonNumber).catch(() => null)

  // ── DB Movie row for comments / likes / watch-history joins ──
  // TMDB-only series otherwise have no Movie record to attach reviews to.
  const dbMovie = await ensureTmdbSeriesMovie(series)

  // Prefer the canonical catalogue (DB/OPhim) title + overview for display so
  // what the user SEES matches what search indexes — avoids the OPhim-vs-TMDB
  // title mismatch (e.g. DB "Thị Trấn Ác Mộng" vs TMDB "Bẫy") that made a movie
  // un-findable by the name shown on its own page.
  if (dbMovie?.title) series.title = dbMovie.title
  if (dbMovie?.description) series.overview = dbMovie.description

  return (
    <main className="min-h-screen bg-background">
      <PageViewTracker path={`/tv/${id}`} />
      {/* ═══════ HERO BACKDROP ═══════ */}
      <section className="relative h-[55vh] min-h-[420px] overflow-hidden md:h-[65vh]">
        {series.backdropUrl && series.backdropUrl !== '/placeholder.jpg' ? (
          <Image
            src={series.backdropUrl}
            alt={series.title}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
        )}

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-0 h-40 w-full bg-gradient-to-t from-background to-transparent" />

        {/* Back */}
        <Link
          href="/series"
          className="absolute left-4 top-5 z-10 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-white/80 border border-white/10 transition hover:bg-white/10 hover:text-white md:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Phim bộ</span>
        </Link>
      </section>

      {/* ═══════ SERIES INFO ═══════ */}
      <section className="relative z-10 mx-auto -mt-48 max-w-7xl px-5 md:-mt-52 md:px-8 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          {/* Poster */}
          <div className="mx-auto w-44 flex-shrink-0 md:mx-0 md:w-60 lg:w-72">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/50 glow-primary">
              <Image
                src={series.posterUrl || '/placeholder.jpg'}
                alt={series.title}
                width={288}
                height={432}
                className="h-auto w-full object-cover"
                priority
              />
            </div>

            {/* Quick score */}
            {series.voteAverage > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-card border border-white/5 px-4 py-3">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-black text-white">{series.voteAverage}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {series.voteCount.toLocaleString()} votes
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6">
            {/* Tagline */}
            {series.tagline && (
              <p className="text-sm font-medium italic text-primary/80">"{series.tagline}"</p>
            )}

            {/* Title */}
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                {series.title}
              </h1>
              {series.originalTitle !== series.title && (
                <p className="mt-1.5 text-sm text-muted-foreground">{series.originalTitle}</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {series.year > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {series.year}
                </span>
              )}
              {series.status && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-muted-foreground border border-white/5">
                  {series.status}
                </span>
              )}
              {series.numberOfSeasons > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                  {series.numberOfSeasons} Phần
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/watch/${series.id}`}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white transition-transform group-hover:scale-110" />
                Xem phim
              </Link>
            </div>

            {/* Overview */}
            {series.overview && (
              <div className="rounded-xl bg-card/50 border border-white/[0.04] p-5">
                <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wider text-white/50">Nội dung</h2>
                <p className="text-sm leading-relaxed text-white/70">{series.overview}</p>
              </div>
            )}

            {/* Creators summary */}
            {creators.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-card/30 border border-white/[0.04] p-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nhà sáng lập</h3>
                  <p className="text-sm font-semibold text-white">
                    {creators.map((c, idx) => (
                      <span key={c.id}>
                        <Link href={`/person/${c.id}`} className="hover:text-primary transition-colors">{c.name}</Link>
                        {idx < creators.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ SEASONS GRID ═══════ */}
      {series.seasons && series.seasons.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-5 text-lg font-bold text-white">Các Phần ({series.seasons.length})</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {series.seasons.map((season) => (
              <Link
                key={season.id}
                href={`/tv/${series.id}/season/${season.seasonNumber}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card transition-all group-hover:border-primary/30 group-hover:shadow-[0_0_25px_rgba(45,212,191,0.15)]">
                  <Image
                    src={season.posterUrl || series.posterUrl || '/placeholder.jpg'}
                    alt={season.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div>
                  <p className="line-clamp-1 text-[13px] font-semibold text-white/90 group-hover:text-primary transition-colors">{season.name}</p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    {season.episodeCount} Tập
                    {season.airDate ? ` · ${season.airDate.substring(0, 4)}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ EPISODES (inline — selected season) ═══════ */}
      {playableSeasons.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-5 md:px-8 lg:px-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-white">
              Danh sách tập{selectedSeason ? ` — ${selectedSeason.name}` : ''}
              {selectedSeason ? <span className="ml-2 text-sm font-medium text-white/40">({selectedSeason.episodes.length} tập)</span> : null}
            </h2>
            {/* Season picker (no JS — re-renders via ?season=N) */}
            <div className="flex flex-wrap gap-1.5">
              {playableSeasons.map((s) => {
                const active = s.seasonNumber === selectedSeasonNumber
                return (
                  <Link
                    key={s.id}
                    href={`/tv/${series.id}?season=${s.seasonNumber}#danh-sach-tap`}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition border ${
                      active
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {s.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div id="danh-sach-tap" className="scroll-mt-24" />

          {!selectedSeason ? (
            <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
              <p className="text-sm text-white/40">Không tải được danh sách tập cho mùa này.</p>
            </div>
          ) : selectedSeason.episodes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
              <p className="text-sm text-white/40">Chưa có dữ liệu tập.</p>
              <Link
                href={`/tv/${series.id}/season/${selectedSeason.seasonNumber}`}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary/80"
              >
                Mở trang chi tiết mùa →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSeason.episodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${series.id}?ep=${ep.slug}`}
                  className="group flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-card/40 p-3 transition hover:border-primary/30 hover:bg-card/70 sm:flex-row"
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40 sm:h-[110px] sm:w-[195px] sm:flex-shrink-0">
                    {ep.stillUrl ? (
                      <Image
                        src={ep.stillUrl}
                        alt={ep.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 195px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <Play className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                        <Play className="h-4 w-4" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/20">
                        Tập {ep.episodeNumber}
                      </span>
                      <h3 className="line-clamp-1 text-[15px] font-semibold text-white/90 group-hover:text-primary transition-colors">
                        {ep.title}
                      </h3>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {ep.airDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ep.airDate}
                        </span>
                      )}
                      {ep.runtimeFormatted && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ep.runtimeFormatted}
                          </span>
                        </>
                      )}
                      {ep.voteAverage > 0 && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {ep.voteAverage}
                          </span>
                        </>
                      )}
                    </div>
                    {ep.overview && (
                      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/55">{ep.overview}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════ COMMENTS ═══════ */}
      <MovieComments movieId={String(dbMovie?.id ?? series.id)} />

      {/* ═══════ RELATED NEWS ═══════ */}
      <div className="mt-14 pb-14">
        <RelatedNews
          movieTitle={series.title}
          originalTitle={series.originalTitle}
          year={series.year}
          limit={6}
        />
      </div>
    </main>
  )
}
