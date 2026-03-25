import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Play, Film, Share2, Heart, Users, Star, Clock, Tv } from 'lucide-react'
import { WatchPageClient } from '@/components/player/WatchPageClient'
import { EpisodeListBar } from '@/components/watch/EpisodeListBar'
import { getMovieDetail } from '@/services/tmdb/movie-service'
import { getMoviePlaybackData, getMoviePlaybackByTmdbId, getMoviePlaybackByTitle } from '@/server/services/playback-service'
import { resolveMovieSource } from '@/services/video-source'
import { MovieRow } from '@/components/shared/MovieRow'
import { getSession } from '@/lib/auth/session'
import type { Metadata } from 'next'
import type { PlayableSource, EpisodePlaybackData } from '@/lib/player/types'

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

  // Check auth for progress features
  const session = await getSession()
  const isLoggedIn = !!session

  // ── Step 1: Try DB-backed playback first ──
  let dbPlayback = await getMoviePlaybackData(id, episodeSlug || undefined)

  // If not found by id/slug, try TMDB ID
  const movieId = Number(id)
  if (!dbPlayback && !isNaN(movieId) && movieId > 0) {
    dbPlayback = await getMoviePlaybackByTmdbId(movieId, episodeSlug || undefined)
  }

  // ── Step 2: Always fetch TMDB metadata for rich UI ──
  let tmdbMovie: Awaited<ReturnType<typeof getMovieDetail>> | null = null
  if (!isNaN(movieId)) {
    try {
      tmdbMovie = await getMovieDetail(movieId)
    } catch {
      // TMDB not available — no problem if we have DB data
    }
  }

  // ── Step 1b: If still no DB match, try title-based fuzzy search ──
  // This bridges TMDB movies (e.g. "One Piece Film: Gold") to OPhim DB (slug "one-piece")
  if (!dbPlayback && tmdbMovie) {
    dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.title, episodeSlug || undefined)
    // Also try original title if different
    if (!dbPlayback && tmdbMovie.originalTitle && tmdbMovie.originalTitle !== tmdbMovie.title) {
      dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.originalTitle, episodeSlug || undefined)
    }
  }

  // If we have neither DB playback nor TMDB data, 404
  if (!dbPlayback && !tmdbMovie) {
    notFound()
  }

  // ── Step 3: Build episode data for player ──
  let episodeData: EpisodePlaybackData | null = dbPlayback?.currentEpisode || null
  let hasDbSource = !!episodeData?.primarySource

  // ── Step 4: Fallback to video-source resolver (Demo/TMDB providers) ──
  let legacySource: Awaited<ReturnType<typeof resolveMovieSource>> | null = null
  if (!hasDbSource && tmdbMovie) {
    try {
      legacySource = await resolveMovieSource(tmdbMovie, episodeSlug)
    } catch {
      legacySource = { available: false, sourceType: 'none' as const, playback: null, episodes: [], providerName: '' }
    }
  }

  // Determine what to show
  const movie = tmdbMovie
  const movieTitle = dbPlayback?.movie?.title || tmdbMovie?.title || 'Phim'
  const movieDescription = dbPlayback?.movie?.description || tmdbMovie?.overview || ''
  const posterUrl = dbPlayback?.movie?.posterUrl || tmdbMovie?.posterUrl || ''
  const backdropUrl = dbPlayback?.movie?.backdropUrl || tmdbMovie?.backdropUrl || ''
  const movieSlug = dbPlayback?.movie?.slug || id
  const dbMovieId = dbPlayback?.movie?.id || id
  const director = tmdbMovie?.crew?.find((c) => c.job === 'Director')

  // Build episode list for navigation
  const episodeList = dbPlayback?.episodes || []
  const providerEps = !hasDbSource && legacySource?.episodes ? legacySource.episodes : []

  // Create fallback episode data from legacy source
  // IMPORTANT: Only use hls/mp4 sources — YouTube/iframe can't play in <video> element
  if (!episodeData && legacySource?.available && legacySource.playback) {
    const playbackType = legacySource.playback.type
    const isPlayableType = playbackType === 'hls' || playbackType === 'mp4'

    if (isPlayableType) {
      episodeData = {
        episode: {
          id: 'legacy-ep',
          episodeNumber: 1,
          episodeName: 'Tập Full',
          episodeSlug: null,
          title: null,
          description: null,
          thumbnailUrl: null,
          duration: null,
          isActive: true,
        },
        sources: [{
          id: 'legacy-src',
          sourceType: playbackType as 'hls' | 'mp4',
          url: legacySource.playback.url,
          label: legacySource.playback.label || 'Main',
          isPrimary: true,
          mimeType: null,
        }],
        primarySource: {
          id: 'legacy-src',
          sourceType: playbackType as 'hls' | 'mp4',
          url: legacySource.playback.url,
          label: legacySource.playback.label || 'Main',
          isPrimary: true,
          mimeType: null,
        },
        subtitles: legacySource.playback.subtitles?.map((s, i) => ({
          id: `legacy-sub-${i}`,
          label: s.label,
          lang: s.lang,
          url: s.url,
          isDefault: s.default || false,
          kind: 'subtitles',
        })) || [],
        nextEpisode: null,
        prevEpisode: null,
      }
      hasDbSource = true
    }
  }

  const hasAnySource = !!episodeData?.primarySource

  return (
    <main className="min-h-screen bg-[#030306]">
      {/* ═══════ PLAYER AREA ═══════ */}
      <section className="relative w-full bg-black">
        {/* Floating back nav */}
        <div className="absolute left-4 top-4 z-20 md:left-6">
          <Link
            href={tmdbMovie ? `/movie/${tmdbMovie.id}` : '/'}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-white/80 border border-white/10 transition hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Chi tiết phim</span>
          </Link>
        </div>

        {/* Player */}
        <div className="relative mx-auto aspect-video max-h-[85vh] w-full overflow-hidden">
          {hasAnySource && episodeData ? (
            <WatchPageClient
              episodeData={episodeData}
              movieId={dbMovieId}
              movieSlug={movieSlug}
              posterUrl={backdropUrl || undefined}
              isLoggedIn={isLoggedIn}
            />
          ) : (
            /* No source available — placeholder */
            <div className="relative flex h-full flex-col items-center justify-center bg-gradient-to-b from-zinc-900/50 via-black to-black">
              {backdropUrl && backdropUrl !== '/placeholder.jpg' && (
                <>
                  <Image
                    src={backdropUrl}
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
                  <h2 className="text-lg font-bold text-white/90">Phim hiện chưa có nguồn phát hợp lệ</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
                    Nguồn phát cho phim này đang được cập nhật bởi quản trị viên. Vui lòng quay lại sau hoặc xem trailer bên dưới.
                  </p>
                </div>
                <div className="flex gap-3">
                  {tmdbMovie?.trailer && (
                    <a
                      href={tmdbMovie.trailer.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Xem Trailer trên YouTube
                    </a>
                  )}
                  <Link
                    href={tmdbMovie ? `/movie/${tmdbMovie.id}` : '/'}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white/80 transition hover:bg-white/20"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ EPISODE LIST ═══════ */}
      {(episodeList.length > 1 || providerEps.length > 0) && (
        <section className="border-t border-white/[0.04] bg-background">
          <div className="mx-auto max-w-7xl px-5 py-4 md:px-8 lg:px-10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/50">
                <Tv className="h-4 w-4" />
                Danh sách tập
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {episodeList.length > 0
                ? episodeList.map((ep) => {
                    const slug = ep.episodeSlug || `tap-${ep.episodeNumber}`
                    const isCurrent = episodeData?.episode?.id === ep.id
                    return (
                      <Link
                        key={ep.id}
                        href={`/watch/${movieSlug}?ep=${slug}`}
                        className={`group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                          isCurrent
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white/5 text-white/70 border border-white/[0.06] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isCurrent && <Play className="h-3 w-3 fill-white flex-shrink-0" />}
                        <span>{ep.episodeName || `Tập ${ep.episodeNumber}`}</span>
                      </Link>
                    )
                  })
                : providerEps.map((ep) => {
                    const isCurrent = episodeSlug === ep.slug
                    return (
                      <Link
                        key={ep.slug}
                        href={`/watch/${id}?ep=${ep.slug}`}
                        className={`group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                          isCurrent
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white/5 text-white/70 border border-white/[0.06] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isCurrent && <Play className="h-3 w-3 fill-white flex-shrink-0" />}
                        <span>Tập {ep.number}</span>
                      </Link>
                    )
                  })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ INFO BAR ═══════ */}
      <section className="border-t border-white/[0.04] bg-background">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Left — Title + Meta */}
            <div className="flex-1 space-y-3">
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                {movieTitle}
              </h1>

              {/* Current episode info */}
              {episodeData?.episode && episodeList.length > 1 && (
                <p className="text-sm text-primary font-medium">
                  {episodeData.episode.episodeName || `Tập ${episodeData.episode.episodeNumber}`}
                  {episodeData.episode.title && episodeData.episode.title !== episodeData.episode.episodeName
                    ? ` — ${episodeData.episode.title}`
                    : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                {movie?.voteAverage && movie.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {movie.voteAverage}
                  </span>
                )}
                {(movie?.year || dbPlayback?.movie.year) && (
                  <span className="text-muted-foreground">{movie?.year || dbPlayback?.movie.year}</span>
                )}
                {movie?.runtimeFormatted && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {movie.runtimeFormatted}
                  </span>
                )}
                {movie?.genres && movie.genres.length > 0 && (
                  <span className="text-muted-foreground/60">
                    {movie.genres.map((g) => g.name).join(' · ')}
                  </span>
                )}
                {dbPlayback?.movie.quality && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/20">
                    {dbPlayback.movie.quality}
                  </span>
                )}
              </div>

              {movieDescription && (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {movieDescription}
                </p>
              )}

              {/* Credits */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {(director || dbPlayback?.movie.directorText) && (
                  <span>
                    <span className="text-white/40">Đạo diễn:</span>{' '}
                    <span className="text-white/70">{director?.name || dbPlayback?.movie.directorText}</span>
                  </span>
                )}
                {(movie?.cast?.length || dbPlayback?.movie.actorText) ? (
                  <span>
                    <span className="text-white/40">Diễn viên:</span>{' '}
                    <span className="text-white/70">
                      {movie?.cast?.slice(0, 3).map((c) => c.name).join(', ') || dbPlayback?.movie.actorText}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Right — Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {tmdbMovie && (
                <Link
                  href={`/movie/${tmdbMovie.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 border border-white/[0.06] transition hover:bg-white/10"
                >
                  <Film className="h-3.5 w-3.5" />
                  Chi tiết
                </Link>
              )}
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
      {movie?.relatedMovies && movie.relatedMovies.length > 0 && (
        <section className="border-t border-white/[0.04] bg-background pb-14 pt-8">
          <MovieRow title="Phim tương tự" movies={movie.relatedMovies} />
        </section>
      )}
    </main>
  )
}
