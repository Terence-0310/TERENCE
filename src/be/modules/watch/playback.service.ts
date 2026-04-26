// ============================================
// Playback Service — fetches playable movie + episode data from DB
// ============================================

import { prisma } from '@/lib/db'
import type {
  EpisodePlaybackData,
  MoviePlaybackData,
} from '@/lib/player/types'
import { mapMovie, mapEpisode, mapSource, mapSubtitle } from './watch.mapper'
import type { PlayableSource, PlayableSubtitle } from '@/lib/player/types'

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
    const streamTypeRaw = episode.streamType || ''
    const isEmbedOrIframe = streamTypeRaw.includes('iframe') || streamTypeRaw.includes('embed') || streamTypeRaw.includes('youtube')
    const mappedType = isEmbedOrIframe ? (streamTypeRaw.includes('youtube') ? 'youtube' : 'iframe') : (streamTypeRaw === 'hls' || streamTypeRaw === 'm3u8' ? 'hls' : 'mp4')
    
    if (mappedType === 'hls' && !isHlsUrl(episode.streamUrl)) {
      // Skip invalid HLS URL unless it's falsely labeled
    } else {
      sources.push({
        id: `legacy-${episode.id}`,
        sourceType: mappedType as 'hls' | 'mp4' | 'iframe' | 'youtube',
        url: episode.streamUrl,
        label: episode.quality || 'Main',
        isPrimary: true,
        mimeType: mappedType === 'hls' ? 'application/x-mpegURL' : (mappedType === 'mp4' ? 'video/mp4' : null),
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

/**
 * Search for a movie by title — used as final fallback when TMDB ID
 * doesn't match any DB record.
 *
 * Strategy:
 * 1. Convert title to slug and try exact slug match
 * 2. Try case-insensitive title match
 * 3. Try partial title match (first significant word ≥ 3 chars)
 *
 * Only returns movies that have at least one episode with a streamUrl.
 */
export async function getMoviePlaybackByTitle(
  title: string,
  episodeSlug?: string,
): Promise<MoviePlaybackData | null> {
  // Generate slug from title
  const slug = toSlug(title)

  // 1. Exact slug match
  const bySlug = await prisma.movie.findFirst({
    where: {
      slug,
      isActive: true,
      episodes: { some: { streamUrl: { not: null } } },
    },
  })
  if (bySlug) return getMoviePlaybackData(bySlug.id, episodeSlug)

  // 2. Case-insensitive title match
  const byTitle = await prisma.movie.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' } as any,
      isActive: true,
      episodes: { some: { streamUrl: { not: null } } },
    },
  })
  if (byTitle) return getMoviePlaybackData(byTitle.id, episodeSlug)

  // 3. Slug-contains match (e.g., "one-piece-film-gold" contains "one-piece")
  //    Try progressively shorter slug prefixes
  const slugParts = slug.split('-')
  if (slugParts.length >= 2) {
    // Try matching first 2-3 significant words
    for (let len = Math.min(slugParts.length, 4); len >= 2; len--) {
      const partialSlug = slugParts.slice(0, len).join('-')
      if (partialSlug.length < 4) continue // too short, skip

      const byPartialSlug = await prisma.movie.findFirst({
        where: {
          slug: { startsWith: partialSlug, mode: 'insensitive' } as any,
          isActive: true,
          episodes: { some: { streamUrl: { not: null } } },
        },
        orderBy: { updatedAt: 'desc' },
      })
      if (byPartialSlug) return getMoviePlaybackData(byPartialSlug.id, episodeSlug)
    }
  }

  // 4. Title contains search — find DB movies whose title appears in search title
  const searchTitle = title.split(':')[0].split('(')[0].trim()
  const byContains = await prisma.movie.findFirst({
    where: {
      title: { contains: searchTitle, mode: 'insensitive' } as any,
      isActive: true,
      episodes: { some: { streamUrl: { not: null } } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  if (byContains) return getMoviePlaybackData(byContains.id, episodeSlug)

  return null
}

// ── Multi-Server Sources ──

export interface ServerSource {
  name: string
  episodes: { name: string; slug: string; url: string }[]
}

/**
 * Get all available server sources for a specific episode.
 * Groups episodes with the same episodeNumber but different serverName.
 * Used for multi-server fallback in HLSPlayer.
 */
export async function getMultiServerSources(
  movieId: string,
  episodeNumber: number,
): Promise<ServerSource[]> {
  // Find all episodes for this movie with the same episode number
  const episodes = await prisma.episode.findMany({
    where: {
      movieId,
      episodeNumber,
      isActive: true,
      isPublished: true,
      status: 'active',
    },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
      },
    },
    orderBy: [{ episodeOrder: 'asc' }],
  })

  // Group by serverName
  const serverMap = new Map<string, { name: string; slug: string; url: string }[]>()

  for (const ep of episodes) {
    const serverName = ep.serverName || 'Server 1'
    const epName = ep.episodeName || `Tập ${ep.episodeNumber}`
    const epSlug = ep.episodeSlug || `tap-${ep.episodeNumber}`

    // Try VideoSource records first
    for (const src of ep.videoSources) {
      if (!isValidUrl(src.url)) continue
      if (src.sourceType === 'iframe' || src.sourceType === 'youtube') continue
      if (src.sourceType === 'hls' && !isHlsUrl(src.url)) continue

      if (!serverMap.has(serverName)) {
        serverMap.set(serverName, [])
      }
      serverMap.get(serverName)!.push({
        name: epName,
        slug: epSlug,
        url: src.url,
      })
    }

    // Fallback to legacy streamUrl
    if (!serverMap.has(serverName) && ep.streamUrl && isValidUrl(ep.streamUrl)) {
      const isEmbed = ep.streamType?.includes('iframe') || ep.streamType?.includes('embed') || ep.streamType?.includes('youtube')
      if (isEmbed) continue
      
      const isHls = ep.streamType === 'hls' || ep.streamType === 'm3u8'
      if (isHls && !isHlsUrl(ep.streamUrl)) continue

      serverMap.set(serverName, [{
        name: epName,
        slug: epSlug,
        url: ep.streamUrl,
      }])
    }
  }

  // Convert to array
  const servers: ServerSource[] = []
  for (const [name, eps] of serverMap) {
    if (eps.length > 0) {
      servers.push({ name, episodes: eps })
    }
  }

  return servers
}

/**
 * Get all servers for a movie with full episode lists.
 * Each server has all its episodes with stream URLs.
 * Used for building the complete server list in the watch page.
 */
export async function getAllMovieServers(
  movieId: string,
): Promise<ServerSource[]> {
  const episodes = await prisma.episode.findMany({
    where: {
      movieId,
      isActive: true,
      isPublished: true,
      status: 'active',
    },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
      },
    },
    orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
  })

  // Group by serverName
  const serverMap = new Map<string, { name: string; slug: string; url: string }[]>()

  for (const ep of episodes) {
    const serverName = ep.serverName || 'Server 1'
    const epName = ep.episodeName || `Tập ${ep.episodeNumber}`
    const epSlug = ep.episodeSlug || `tap-${ep.episodeNumber}`

    let streamUrl: string | null = null

    // Try VideoSource records first
    for (const src of ep.videoSources) {
      if (!isValidUrl(src.url)) continue
      if (src.sourceType === 'iframe' || src.sourceType === 'youtube') continue
      if (src.sourceType === 'hls' && !isHlsUrl(src.url)) continue
      streamUrl = src.url
      break
    }

    // Fallback to legacy streamUrl
    if (!streamUrl && ep.streamUrl && isValidUrl(ep.streamUrl)) {
      const isEmbed = ep.streamType?.includes('iframe') || ep.streamType?.includes('embed') || ep.streamType?.includes('youtube')
      if (isEmbed) continue

      const isHls = ep.streamType === 'hls' || ep.streamType === 'm3u8'
      if (isHls && !isHlsUrl(ep.streamUrl)) continue
      streamUrl = ep.streamUrl
    }

    if (streamUrl) {
      if (!serverMap.has(serverName)) {
        serverMap.set(serverName, [])
      }
      serverMap.get(serverName)!.push({
        name: epName,
        slug: epSlug,
        url: streamUrl,
      })
    }
  }

  const servers: ServerSource[] = []
  for (const [name, eps] of serverMap) {
    if (eps.length > 0) {
      servers.push({ name, episodes: eps })
    }
  }

  return servers
}

// ── Slug helper ──
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

