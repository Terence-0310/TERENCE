import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Film, Users, Star, Clock } from 'lucide-react'
import { WatchPageClient } from '@/src/fe/components/player/WatchPageClient'
import { WatchPageContainer } from '@/src/fe/components/player/WatchPageContainer'
import { ServerEpisodeList } from '@/src/fe/components/watch/ServerEpisodeList'
import { WatchActionButtons } from '@/src/fe/components/watch/WatchActionButtons'

import { getMovieDetail } from '@/src/be/services/tmdb/movie-service'
import { getTvDetail } from '@/src/be/services/tmdb/tv-service'
import { getMoviePlaybackData, getMoviePlaybackByTmdbId, getMoviePlaybackByTitle, getMultiServerSources } from '@/src/be/modules/watch/playback.service'
import { resolveMovieSource } from '@/src/be/services/video-source'
import { MovieRow } from '@/src/fe/components/shared/MovieRow'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActivePerks } from '@/src/be/modules/tcoin/tcoin.service'
import { Lock } from 'lucide-react'
import type { Metadata } from 'next'
import type { EpisodePlaybackData } from '@/lib/player/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ep?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  // Only hit TMDB when id is numeric — otherwise it's a DB slug and TMDB
  // would log a noisy "Blocked invalid endpoint fetch: /movie/NaN".
  const numericId = Number(id)
  if (!isNaN(numericId) && numericId > 0) {
    try {
      const movie = await getMovieDetail(numericId)
      return { title: `Xem ${movie.title} — Terence` }
    } catch {
      // fall through
    }
  }
  return { title: 'Xem phim — Terence' }
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { ep: episodeSlug } = await searchParams

  // Auth session — drives TCoin perks (HD quality, early access).
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  const perks = userId ? await getActivePerks(userId) : null
  const canUseHD = !!perks?.hdUpgrade
  const canEarlyAccess = !!perks?.earlyAccess

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
      try {
        const tv = await getTvDetail(movieId)
        tmdbMovie = {
          ...tv,
          crew: [], // Mock properties not present in SeriesDetail
          cast: [],
          genres: [],
          trailer: null,
          videos: [],
          relatedMovies: [],
          budget: 0,
          revenue: 0,
          runtime: null,
          runtimeFormatted: '',
          imdbId: null,
          homepage: null,
        } as unknown as Awaited<ReturnType<typeof getMovieDetail>>
      } catch {
        // TMDB not available — no problem if we have DB data
      }
    }
  }

  // ── Step 1b: If still no DB match, try title-based search with strict
  // year + tmdbId guards. The hints prevent substituting a different
  // movie just because its title shares tokens (poster ↔ playback mismatch).
  if (!dbPlayback && tmdbMovie) {
    const hints = { year: tmdbMovie.year ?? null, tmdbId: tmdbMovie.id ?? null }
    dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.title, episodeSlug || undefined, hints)
    if (!dbPlayback && tmdbMovie.originalTitle && tmdbMovie.originalTitle !== tmdbMovie.title) {
      dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.originalTitle, episodeSlug || undefined, hints)
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

  // Back-link target. Derive it from the DB movie's own identity rather than
  // `tmdbMovie`: that record is fetched from the TMDB *movie* endpoint using the
  // URL id and can resolve to a completely unrelated film when the watched
  // title is a TV series — TMDB's movie and TV id spaces overlap, so a TV id
  // passed to the movie endpoint returns a different movie. Route by contentType.
  const seriesContentTypes = ['series', 'tv', 'anime']
  const backHref = (() => {
    const m = dbPlayback?.movie
    if (m?.tmdbId) {
      return seriesContentTypes.includes(m.contentType ?? '')
        ? `/tv/${m.tmdbId}`
        : `/movie/${m.tmdbId}`
    }
    if (tmdbMovie?.id) return `/movie/${tmdbMovie.id}`
    return '/'
  })()

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

  // ── Early-access embargo ──
  // While earlyAccessUntil is in the future, only TCoin early-access perk
  // holders may watch. Everyone else sees a locked overlay with the time left.
  const earlyAccessUntil = dbPlayback?.movie?.earlyAccessUntil
    ? new Date(dbPlayback.movie.earlyAccessUntil)
    : null
  const earlyAccessLocked =
    !!earlyAccessUntil && earlyAccessUntil.getTime() > Date.now() && !canEarlyAccess
  const earlyAccessHoursLeft = earlyAccessUntil
    ? Math.max(1, Math.ceil((earlyAccessUntil.getTime() - Date.now()) / 3_600_000))
    : 0

  // ── Step 5: Get multi-server sources for fallback ──
  let multiServerSources: Awaited<ReturnType<typeof getMultiServerSources>> = []
  if (dbPlayback?.movie?.id && episodeData?.episode) {
    try {
      multiServerSources = await getMultiServerSources(
        dbPlayback.movie.id,
        episodeData.episode.episodeNumber,
      )
    } catch {
      // Non-critical — fallback to single server
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 pt-8">
        
        {/* ═══════ BACK LINK ═══════ */}
        <header className="mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1.5 pr-4 pl-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white mb-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40">
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
            Xem phim {movieTitle}
          </Link>
        </header>
      </div>

      <div className="w-full mx-auto max-w-[1400px] px-0 sm:px-4 md:px-8 mt-2 flex-grow">
        <div className="w-full">
          <WatchPageContainer
            headerArea={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-0">
                <div>
                  <h1 className="text-lg font-bold text-white md:text-xl tracking-tight">
                    {movieTitle}
                  </h1>
                  {(episodeData?.episode || episodeList.length > 0) && (
                    <p className="mt-1 text-[13px] font-medium text-white/60">
                      Phần 1 - {episodeData?.episode?.episodeName || `Tập ${episodeData?.episode?.episodeNumber || providerEps.find(e => e.slug === episodeSlug)?.number || ''}`}
                    </p>
                  )}
                </div>

                {(episodeList.length > 1 || providerEps.length > 0) && (
                  <a 
                    href="#episode-list"
                    className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white shrink-0 border border-white/[0.04]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
                    Danh sách tập
                  </a>
                )}
              </div>
            }
            playerArea={
              <>
                {earlyAccessLocked ? (
                  /* Early-access embargo — perk-gated */
                  <div className="relative flex h-full flex-col items-center justify-center bg-zinc-900/60">
                    {backdropUrl && backdropUrl !== '/placeholder.jpg' && (
                      <>
                        <Image src={backdropUrl} alt="" fill className="object-cover opacity-20 blur-sm" />
                        <div className="absolute inset-0 bg-black/70" />
                      </>
                    )}
                    <div className="relative z-10 flex max-w-md flex-col items-center gap-5 px-6 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <Lock className="h-9 w-9 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white/90">Phim đang chiếu sớm</h2>
                        <p className="mt-2 text-sm leading-relaxed text-white/50">
                          Phim này mở công khai sau khoảng <span className="font-semibold text-white/80">{earlyAccessHoursLeft} giờ</span> nữa.
                          Đổi <span className="font-semibold text-primary">100 TCoin</span> cho ưu đãi “Xem sớm 24h” để xem ngay bây giờ.
                        </p>
                      </div>
                      <Link
                        href="/tcoin"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                      >
                        Mở khoá với TCoin
                      </Link>
                    </div>
                  </div>
                ) : hasAnySource && episodeData ? (
                  <WatchPageClient
                    episodeData={episodeData}
                    movieId={dbPlayback?.movie?.id || ''}
                    movieSlug={movieSlug}
                    movieTitle={movieTitle}
                    posterUrl={backdropUrl || undefined}
                    thumbUrl={posterUrl || undefined}
                    trailerUrl={tmdbMovie?.trailer?.embedUrl}
                    additionalServers={multiServerSources}
                    canUseHD={canUseHD}
                  />
                ) : legacySource?.available && legacySource.playback && (legacySource.playback.type === 'iframe' || legacySource.playback.type === 'youtube') ? (
                  /* Legacy source has an unplayable iframe/youtube type, so just render it directly */
                  <div className="relative flex h-full w-full bg-black">
                    <iframe
                      src={legacySource.playback.url}
                      className="h-full w-full border-0"
                      allowFullScreen
                    />
                  </div>
                ) : tmdbMovie?.trailer?.embedUrl ? (
                  /* No source available but has trailer */
                  <div className="relative flex h-full w-full bg-black">
                    <iframe
                      src={tmdbMovie.trailer.embedUrl}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  /* No source available and no trailer — placeholder */
                  <div className="relative flex h-full flex-col items-center justify-center bg-zinc-900/50">
                    {backdropUrl && backdropUrl !== '/placeholder.jpg' && (
                      <>
                        <Image
                          src={backdropUrl}
                          alt=""
                          fill
                          className="object-cover opacity-20 blur-sm"
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
                          Nguồn phát cho phim này hiện chưa khả dụng.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            }
          />
        </div>
      </div>

      {/* We moved Episode List below Info Bar */}

      {/* ═══════ INFO BAR ═══════ */}
      <section className="border-t border-white/[0.04] bg-background mt-8">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Left — Meta and Details */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                {movie?.voteAverage && movie.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {movie.voteAverage}
                  </span>
                )}
                {(movie?.year || dbPlayback?.movie?.year) && (
                  <span className="text-muted-foreground">{movie?.year || dbPlayback?.movie?.year}</span>
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
                {dbPlayback?.movie?.quality && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/20">
                    {dbPlayback?.movie?.quality}
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
                {(director) && (
                  <span>
                    <span className="text-white/40">Đạo diễn:</span>{' '}
                    <span className="text-white/70">{director?.name}</span>
                  </span>
                 )}
                {(movie?.cast?.length) ? (
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="text-white/40">Diễn viên:</span>
                    {movie.cast.slice(0, 3).map((c, idx) => (
                      <span key={c.id || idx} className="text-white/70">
                        <Link href={`/person/${c.id}`} className="hover:text-primary transition-colors">
                          {c.name}
                        </Link>
                        {idx < Math.min(movie?.cast?.length || 0, 3) - 1 ? ', ' : ''}
                      </span>
                    ))}
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
              <WatchActionButtons shareTitle={`Xem ${dbPlayback?.movie?.title || tmdbMovie?.title || 'phim'} — Terence`} />
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

      {/* ═══════ EPISODES LIST (BOTTOM) ═══════ */}
      {(episodeList.length > 1 || providerEps.length > 0) && (
        <section id="episode-list" className="border-t border-white/[0.04] bg-background/30">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
              Danh sách tập
            </h3>
            <ServerEpisodeList 
              episodeList={episodeList}
              providerEps={providerEps}
              movieSlug={movieSlug}
              movieId={dbMovieId.toString()}
              backdropUrl={backdropUrl}
              currentEpisodeId={episodeData?.episode?.id}
              currentEpisodeSlug={episodeSlug}
            />
          </div>
        </section>
      )}

      {/* ═══════ RELATED MOVIES ═══════ */}
      {movie?.relatedMovies && movie.relatedMovies.length > 0 && (
        <section className="border-t border-white/[0.04] bg-background pb-14 pt-8">
          <MovieRow title="Phim tương tự" movies={movie.relatedMovies} />
        </section>
      )}
    </main>
  )
}
