// ============================================
// Playback Service — fetches playable movie + episode data from DB
// ============================================

import { prisma } from '@/lib/db'
import type {
  PlayableMovie,
  PlayableEpisode,
  PlayableSource,
  PlayableSubtitle,
  EpisodePlaybackData,
  MoviePlaybackData,
} from '@/lib/player/types'

// ── URL validation ──

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function isHlsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.pathname.endsWith('.m3u8')
  } catch {
    return false
  }
}

// ── Map DB models to playable types ──

function mapMovie(m: any): PlayableMovie {
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    description: m.description,
    contentType: m.contentType,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    year: m.year,
    quality: m.quality,
    rating: m.rating,
    categoryText: m.categoryText,
    directorText: m.directorText,
    actorText: m.actorText,
    countryText: m.countryText,
  }
}

function mapEpisode(ep: any): PlayableEpisode {
  return {
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    episodeName: ep.episodeName,
    episodeSlug: ep.episodeSlug,
    title: ep.title,
    description: ep.description,
    thumbnailUrl: ep.thumbnailUrl,
    duration: ep.duration,
    isActive: ep.isActive,
  }
}

function mapSource(src: any): PlayableSource {
  return {
    id: src.id,
    sourceType: src.sourceType as 'hls' | 'mp4',
    url: src.url,
    label: src.label,
    isPrimary: src.isPrimary,
    mimeType: src.mimeType,
  }
}

function mapSubtitle(sub: any): PlayableSubtitle {
  return {
    id: sub.id,
    label: sub.label,
    lang: sub.lang,
    url: sub.url,
    isDefault: sub.isDefault,
    kind: sub.kind,
  }
}

// ── Public API ──

/**
 * Get full playback data for a movie by its DB id or slug.
 * Returns null if movie not found or not published.
 */
export async function getMoviePlaybackData(
  movieIdOrSlug: string,
  episodeSlug?: string,
): Promise<MoviePlaybackData | null> {
  // Try by ID first, then by slug
  const movie = await prisma.movie.findFirst({
    where: {
      OR: [{ id: movieIdOrSlug }, { slug: movieIdOrSlug }],
      isActive: true,
    },
  })

  if (!movie) return null

  // Get published episodes
  const episodes = await prisma.episode.findMany({
    where: {
      movieId: movie.id,
      isActive: true,
      isPublished: true,
      status: 'active',
    },
    orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
  })

  const playableEpisodes = episodes.map(mapEpisode)

  // Determine current episode
  let currentEpisodeData: EpisodePlaybackData | null = null
  if (episodes.length > 0) {
    let targetEpisode = episodes[0] // default to first
    if (episodeSlug) {
      const found = episodes.find(
        (ep) => ep.episodeSlug === episodeSlug || ep.slug === episodeSlug,
      )
      if (found) targetEpisode = found
    }

    currentEpisodeData = await getEpisodePlaybackData(targetEpisode.id, episodes)
  }

  return {
    movie: mapMovie(movie),
    episodes: playableEpisodes,
    currentEpisode: currentEpisodeData,
    totalEpisodes: episodes.length,
  }
}

/**
 * Get playback data for a specific episode.
 */
export async function getEpisodePlaybackData(
  episodeId: string,
  allEpisodes?: any[],
): Promise<EpisodePlaybackData | null> {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, isActive: true },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }],
      },
      subtitleTracks: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }],
      },
    },
  })

  if (!episode) return null

  // If allEpisodes not provided, fetch them
  if (!allEpisodes) {
    allEpisodes = await prisma.episode.findMany({
      where: {
        movieId: episode.movieId,
        isActive: true,
        isPublished: true,
        status: 'active',
      },
      orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
    })
  }

  // Build sources list — combine VideoSource records + legacy streamUrl
  const sources: PlayableSource[] = []

  // Add VideoSource records
  for (const src of episode.videoSources) {
    if (!isValidUrl(src.url)) continue
    // Validate: HLS sources must have .m3u8 URLs
    if (src.sourceType === 'hls' && !isHlsUrl(src.url)) continue
    sources.push(mapSource(src))
  }

  // Fallback: use legacy streamUrl if no VideoSource exists
  if (sources.length === 0 && episode.streamUrl && isValidUrl(episode.streamUrl)) {
    const legacyType = episode.streamType === 'hls' ? 'hls' : 'mp4' as const
    if (legacyType === 'hls' && !isHlsUrl(episode.streamUrl)) {
      // Skip invalid HLS URL
    } else {
      sources.push({
        id: `legacy-${episode.id}`,
        sourceType: legacyType,
        url: episode.streamUrl,
        label: episode.quality || 'Main',
        isPrimary: true,
        mimeType: legacyType === 'hls' ? 'application/x-mpegURL' : 'video/mp4',
      })
    }
  }

  // Build subtitles list — combine SubtitleTrack records + legacy subtitleUrl
  const subtitles: PlayableSubtitle[] = []

  for (const sub of episode.subtitleTracks) {
    if (!isValidUrl(sub.url)) continue
    subtitles.push(mapSubtitle(sub))
  }

  // Fallback: use legacy subtitleUrl
  if (subtitles.length === 0 && episode.subtitleUrl && isValidUrl(episode.subtitleUrl)) {
    subtitles.push({
      id: `legacy-sub-${episode.id}`,
      label: 'Phụ đề',
      lang: episode.language || 'vi',
      url: episode.subtitleUrl,
      isDefault: true,
      kind: 'subtitles',
    })
  }

  // Find prev/next episodes
  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode.id)
  const prevEp = currentIndex > 0 ? mapEpisode(allEpisodes[currentIndex - 1]) : null
  const nextEp =
    currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? mapEpisode(allEpisodes[currentIndex + 1])
      : null

  const primarySource = sources.find((s) => s.isPrimary) || sources[0] || null

  return {
    episode: mapEpisode(episode),
    sources,
    primarySource,
    subtitles,
    nextEpisode: nextEp,
    prevEpisode: prevEp,
  }
}

/**
 * Get movie by TMDB ID and return playback data.
 * Used when watch page receives TMDB ID instead of DB ID.
 */
export async function getMoviePlaybackByTmdbId(
  tmdbId: number,
  episodeSlug?: string,
): Promise<MoviePlaybackData | null> {
  const movie = await prisma.movie.findFirst({
    where: { tmdbId, isActive: true },
  })
  if (!movie) return null
  return getMoviePlaybackData(movie.id, episodeSlug)
}
