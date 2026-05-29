// ============================================
// TV Season detail — /tv/[id]/season/[seasonNumber]
// ============================================
// Lists every episode in the selected season with a thumbnail + meta + a
// "Xem" link to the player.

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Play, Calendar, Clock, Star } from 'lucide-react'
import { getTvDetail, getSeasonDetail } from '@/src/be/services/tmdb/tv-service'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string; seasonNumber: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, seasonNumber } = await params
  const tvId = Number(id)
  const sn = Number(seasonNumber)
  if (!Number.isFinite(tvId) || !Number.isFinite(sn)) return { title: 'Mùa phim — Terence' }
  try {
    const [series, season] = await Promise.all([getTvDetail(tvId), getSeasonDetail(tvId, sn)])
    if (!season) return { title: 'Mùa phim — Terence' }
    return {
      title: `${series.title} — ${season.name} (${season.airDate?.slice(0, 4) || ''}) — Terence`,
      description: season.overview?.slice(0, 155) || series.overview?.slice(0, 155) || '',
    }
  } catch {
    return { title: 'Mùa phim — Terence' }
  }
}

export default async function TvSeasonPage({ params }: PageProps) {
  const { id, seasonNumber } = await params
  const tvId = Number(id)
  const sn = Number(seasonNumber)
  if (!Number.isFinite(tvId) || !Number.isFinite(sn)) notFound()

  let series: Awaited<ReturnType<typeof getTvDetail>> | null = null
  try {
    series = await getTvDetail(tvId)
  } catch {
    notFound()
  }
  const season = await getSeasonDetail(tvId, sn)
  if (!series || !season) notFound()

  const seasonYear = season.airDate?.slice(0, 4)
  const heroBackdrop = series.backdropUrl

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* ═══════ HERO ═══════ */}
      <section className="relative">
        {heroBackdrop && (
          <>
            <Image
              src={heroBackdrop}
              alt=""
              fill
              priority
              className="object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
          </>
        )}

        <div className="relative mx-auto max-w-7xl px-5 md:px-8 lg:px-10 pt-24 pb-8">
          {/* Back to series */}
          <Link
            href={`/tv/${series.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1.5 pr-4 pl-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40">
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
            {series.title}
          </Link>

          {/* Season header */}
          <div className="mt-6 flex flex-col items-start gap-6 md:flex-row md:items-end">
            <div className="relative h-[210px] w-[140px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-card shadow-2xl">
              <Image
                src={season.posterUrl || series.posterUrl || '/placeholder.jpg'}
                alt={season.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-widest text-primary">{series.title}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">{season.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {seasonYear || 'N/A'}
                </span>
                <span className="text-white/20">·</span>
                <span>{season.episodes.length} tập</span>
              </p>
              {season.overview && (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70">{season.overview}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ EPISODES LIST ═══════ */}
      <section className="mx-auto mt-8 max-w-7xl px-5 md:px-8 lg:px-10">
        <h2 className="mb-5 text-lg font-bold text-white">Danh sách tập ({season.episodes.length})</h2>

        {season.episodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center">
            <p className="text-sm text-white/40">Chưa có dữ liệu tập cho mùa này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {season.episodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/watch/${series!.id}?ep=${ep.slug}`}
                className="group flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-card/40 p-3 transition hover:border-primary/30 hover:bg-card/70 sm:flex-row"
              >
                {/* Thumbnail */}
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

                {/* Meta */}
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

        {/* Other seasons quick nav */}
        {series.seasons.length > 1 && (
          <div className="mt-12 rounded-2xl border border-white/[0.06] bg-card/30 p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/40">Các mùa khác</p>
            <div className="flex flex-wrap gap-2">
              {series.seasons.map((s) => (
                <Link
                  key={s.id}
                  href={`/tv/${series!.id}/season/${s.seasonNumber}`}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                    s.seasonNumber === season.seasonNumber
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
