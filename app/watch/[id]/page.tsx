import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Play, Film, Share2, Heart, Users, Star, Clock } from 'lucide-react'
import { VideoPlayer } from '@/components/watch/VideoPlayer'
import { EpisodeListBar } from '@/components/watch/EpisodeListBar'
import { getMovieDetail } from '@/services/tmdb/movie-service'
import { resolveMovieSource } from '@/services/video-source'
import { MovieRow } from '@/components/shared/MovieRow'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ep?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const movie = await getMovieDetail(Number(id))
    return { title: `Xem ${movie.title} — Terence` }
  } catch {
    return { title: 'Xem phim — Terence' }
  }
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { ep: episodeSlug } = await searchParams
  const movieId = Number(id)
  if (isNaN(movieId)) notFound()

  let movie
  try {
    movie = await getMovieDetail(movieId)
  } catch {
    notFound()
  }

  // Resolve video source via provider system (safe — never crash)
  let source
  try {
    source = await resolveMovieSource(movie, episodeSlug)
  } catch (err) {
    console.error('[WatchPage] Source resolution failed:', err)
    source = { available: false, playback: null, episodes: [], providerName: '' }
  }
  const director = movie.crew.find((c) => c.job === 'Director')

  return (
    <main className="min-h-screen bg-[#030306]">
      {/* ═══════ PLAYER AREA ═══════ */}
      <section className="relative w-full bg-black">
        {/* Floating back nav */}
        <div className="absolute left-4 top-4 z-20 md:left-6">
          <Link
            href={`/movie/${movie.id}`}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-white/80 border border-white/10 transition hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Chi tiết phim</span>
          </Link>
        </div>

        {/* Player */}
        <div className="relative mx-auto aspect-video max-h-[85vh] w-full overflow-hidden">
          {source.available && source.playback ? (
            // ── Render based on source type ──
            source.playback.type === 'youtube' || source.playback.type === 'iframe' ? (
              <iframe
                src={
                  source.playback.type === 'youtube'
                    ? `${source.playback.url}&autoplay=1&iv_load_policy=3`
                    : source.playback.url
                }
                title={movie.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            ) : source.playback.type === 'mp4' || source.playback.type === 'hls' ? (
              <VideoPlayer
                src={source.playback.url}
                type={source.playback.type}
                poster={movie.backdropUrl || undefined}
                movieId={movie.id}
                episodeId={episodeSlug}
                subtitles={source.playback.subtitles}
              />
            ) : null
          ) : (
            /* No source available — placeholder */
            <div className="relative flex h-full flex-col items-center justify-center bg-gradient-to-b from-zinc-900/50 via-black to-black">
              {/* Background poster blur */}
              {movie.backdropUrl && movie.backdropUrl !== '/placeholder.jpg' && (
                <>
                  <Image
                    src={movie.backdropUrl}
                    alt=""
                    fill
                    className="object-cover opacity-15 blur-sm"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                </>
              )}

              <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <Film className="h-9 w-9 text-white/30" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white/90">Đang cập nhật nguồn phát</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
                    Nguồn phát cho phim này đang được cập nhật. Vui lòng quay lại sau hoặc xem trailer bên dưới.
                  </p>
                </div>
                {movie.trailer && (
                  <a
                    href={movie.trailer.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Xem Trailer trên YouTube
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ EPISODE LIST (if available) ═══════ */}
      {source.episodes.length > 0 && (
        <EpisodeListBar
          providerEpisodes={source.episodes}
          currentEpisodeSlug={episodeSlug}
          watchUrl={`/watch/${movie.id}`}
        />
      )}

      {/* ═══════ INFO BAR ═══════ */}
      <section className="border-t border-white/[0.04] bg-background">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Left — Title + Meta */}
            <div className="flex-1 space-y-3">
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                {movie.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {movie.voteAverage}
                  </span>
                )}
                {movie.year > 0 && (
                  <span className="text-muted-foreground">{movie.year}</span>
                )}
                {movie.runtimeFormatted && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {movie.runtimeFormatted}
                  </span>
                )}
                {movie.genres.length > 0 && (
                  <span className="text-muted-foreground/60">
                    {movie.genres.map((g) => g.name).join(' · ')}
                  </span>
                )}
                {source.available && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/20">
                    {source.providerName}
                  </span>
                )}
              </div>

              {movie.overview && (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {movie.overview}
                </p>
              )}

              {/* Credits */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {director && (
                  <span>
                    <span className="text-white/40">Đạo diễn:</span>{' '}
                    <span className="text-white/70">{director.name}</span>
                  </span>
                )}
                {movie.cast.length > 0 && (
                  <span>
                    <span className="text-white/40">Diễn viên:</span>{' '}
                    <span className="text-white/70">{movie.cast.slice(0, 3).map((c) => c.name).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right — Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <Link
                href={`/movie/${movie.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 border border-white/[0.06] transition hover:bg-white/10"
              >
                <Film className="h-3.5 w-3.5" />
                Chi tiết
              </Link>
              <button className="rounded-lg bg-white/5 p-2.5 text-white/50 border border-white/[0.06] transition hover:bg-white/10 hover:text-white" title="Yêu thích">
                <Heart className="h-4 w-4" />
              </button>
              <button className="rounded-lg bg-white/5 p-2.5 text-white/50 border border-white/[0.06] transition hover:bg-white/10 hover:text-white" title="Chia sẻ">
                <Share2 className="h-4 w-4" />
              </button>
              <Link
                href="/xem-chung"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2.5 text-xs font-medium text-primary border border-primary/20 transition hover:bg-primary/20"
              >
                <Users className="h-3.5 w-3.5" />
                Xem chung
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ RELATED MOVIES ═══════ */}
      {movie.relatedMovies.length > 0 && (
        <section className="border-t border-white/[0.04] bg-background pb-14 pt-8">
          <MovieRow title="Phim tương tự" movies={movie.relatedMovies} />
        </section>
      )}
    </main>
  )
}
