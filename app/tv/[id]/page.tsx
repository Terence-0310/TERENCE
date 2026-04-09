import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, Calendar, Play, ArrowLeft, Tv } from 'lucide-react'
import { getTvDetail } from '@/services/tmdb/tv-service'
import { MovieComments } from '@/components/shared/MovieComments'
import { RelatedNews } from '@/components/news/RelatedNews'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
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

export default async function SeriesDetailPage({ params }: PageProps) {
  const { id } = await params
  const seriesId = Number(id)
  if (isNaN(seriesId)) notFound()

  let series
  try {
    series = await getTvDetail(seriesId)
  } catch {
    notFound()
  }

  const creators = series.creators || []

  return (
    <main className="min-h-screen bg-background">
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
                  <p className="text-sm font-semibold text-white">{creators.map((c) => c.name).join(', ')}</p>
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
              <div key={season.id} className="group flex flex-col gap-2">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card transition-all group-hover:border-primary/30">
                  <Image
                    src={season.posterUrl || series.posterUrl || '/placeholder.jpg'}
                    alt={season.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div>
                  <p className="line-clamp-1 text-[13px] font-semibold text-white/90">{season.name}</p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    {season.episodeCount} Tập
                    {season.airDate ? ` · ${season.airDate.substring(0, 4)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ COMMENTS ═══════ */}
      <MovieComments movieId={String(series.id)} />

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
