// ============================================
// Watch Module — Service (business logic)
// ============================================
// Orchestrates repository calls + source resolution.
// This is the ONLY layer API routes should call.

import * as repo from './watch.repository'
import type {
  WatchBootstrapResponse,
  WatchMovieDetail,
  WatchEpisodeItem,
  WatchVideoSource,
  WatchSubtitle,
  WatchCurrentEpisode,
  WatchServer,
  WatchResumeProgress,
  SaveProgressInput,
  SaveProgressResponse,
  ContinueWatchingItem,
} from './watch.types'

// ═══════════════════════════════════════════════
// URL Validation helpers
// ═══════════════════════════════════════════════

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

function isHlsUrl(url: string): boolean {
  try { return new URL(url).pathname.endsWith('.m3u8') } catch { return false }
}

// ═══════════════════════════════════════════════
// BOOTSTRAP — Full watch page data
// ═══════════════════════════════════════════════

export async function bootstrap(
  movieSlug: string,
  episodeSlugOrNumber?: string,
  userId?: string,
): Promise<WatchBootstrapResponse | null> {
  // 1. Find movie
  const movie = await repo.findMovieBySlug(movieSlug)
  if (!movie) return null

  // 2. Get all active episodes
  const episodes = await repo.findActiveEpisodes(movie.id)
  const episodeItems: WatchEpisodeItem[] = episodes.map(mapEpisodeItem)

  // 3. Determine target episode
  let targetEp = episodes[0] ?? null
  if (episodeSlugOrNumber) {
    const found = episodes.find(
      (ep) =>
        ep.episodeSlug === episodeSlugOrNumber ||
        ep.slug === episodeSlugOrNumber ||
        String(ep.episodeNumber) === episodeSlugOrNumber,
    )
    if (found) targetEp = found
  }

  // 4. Build current episode with sources
  let currentEpisode: WatchCurrentEpisode | null = null
  if (targetEp) {
    currentEpisode = await buildCurrentEpisode(targetEp.id, episodes, movie.id)
  }

  // 5. Resume progress (if user is logged in)
  let resumeProgress: WatchResumeProgress | null = null
  if (userId && targetEp) {
    const progress = await repo.findWatchProgress(userId, movie.id, targetEp.id)
    if (progress && !progress.isCompleted && (progress.currentTime ?? 0) > 15) {
      resumeProgress = {
        episodeId: progress.episodeId,
        currentTime: progress.currentTime ?? 0,
        duration: progress.duration,
        progress: progress.progress,
        lastWatchedAt: progress.lastWatchedAt.toISOString(),
      }
    } else if (!progress && userId) {
      // Check if there's progress for any episode of this movie
      const movieProgress = await repo.findLatestMovieProgress(userId, movie.id)
      if (movieProgress && !movieProgress.isCompleted && (movieProgress.currentTime ?? 0) > 15) {
        resumeProgress = {
          episodeId: movieProgress.episodeId,
          currentTime: movieProgress.currentTime ?? 0,
          duration: movieProgress.duration,
          progress: movieProgress.progress,
          lastWatchedAt: movieProgress.lastWatchedAt.toISOString(),
        }
      }
    }
  }

  // 6. Increment view count (fire-and-forget)
  repo.incrementMovieViewCount(movie.id)
  if (targetEp) repo.incrementEpisodeViewCount(targetEp.id)

  return {
    movie: mapMovieDetail(movie),
    episodes: episodeItems,
    currentEpisode,
    totalEpisodes: episodes.length,
    resumeProgress,
  }
}

// ═══════════════════════════════════════════════
// SAVE PROGRESS
// ═══════════════════════════════════════════════

const COMPLETED_THRESHOLD = 92 // % progress to mark as completed

export async function saveProgress(
  userId: string,
  input: SaveProgressInput,
): Promise<SaveProgressResponse> {
  const { movieId, episodeId, currentTime, duration, deviceType } = input

  if (duration <= 0 || currentTime < 0) {
    return { ok: false, progress: 0, isCompleted: false }
  }

  const progress = Math.min(100, Math.round((currentTime / duration) * 100))
  const isCompleted = progress >= COMPLETED_THRESHOLD

  await repo.upsertWatchProgress({
    userId,
    movieId,
    episodeId: episodeId ?? null,
    currentTime: Math.round(currentTime),
    duration: Math.round(duration),
    progress,
    isCompleted,
    deviceType,
  })

  return { ok: true, progress, isCompleted }
}

// ═══════════════════════════════════════════════
// MARK COMPLETE
// ═══════════════════════════════════════════════

export async function markComplete(
  userId: string,
  movieId: string,
  episodeId?: string | null,
) {
  return repo.markWatchCompleted(userId, movieId, episodeId)
}

// ═══════════════════════════════════════════════
// CONTINUE WATCHING
// ═══════════════════════════════════════════════

export async function getContinueWatching(
  userId: string,
  limit: number = 20,
): Promise<ContinueWatchingItem[]> {
  const records = await repo.getContinueWatchingItems(userId, limit)

  return records.map((record) => ({
    id: record.id,
    movie: {
      id: record.movie.id,
      slug: record.movie.slug,
      title: record.movie.title,
      posterUrl: record.movie.posterUrl,
      backdropUrl: record.movie.backdropUrl,
      thumbUrl: record.movie.thumbUrl,
      contentType: record.movie.contentType,
      year: record.movie.year,
      quality: record.movie.quality,
    },
    episode: record.episode
      ? {
          id: record.episode.id,
          episodeNumber: record.episode.episodeNumber,
          episodeName: record.episode.episodeName,
          episodeSlug: record.episode.episodeSlug,
        }
      : null,
    progress: record.progress,
    currentTime: record.currentTime ?? 0,
    duration: record.duration,
    lastWatchedAt: record.lastWatchedAt.toISOString(),
    isCompleted: record.isCompleted,
  }))
}

// ═══════════════════════════════════════════════
// LEGACY RE-EXPORTS (backward compat)
// ═══════════════════════════════════════════════

export {
  getMoviePlaybackData,
  getMoviePlaybackByTmdbId,
  getMoviePlaybackByTitle,
  getEpisodePlaybackData,
  getMultiServerSources,
  getAllMovieServers,
  type ServerSource,
} from '@/server/services/playback-service'

// ═══════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════

function mapMovieDetail(m: any): WatchMovieDetail {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    description: m.description,
    contentType: m.contentType,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    thumbUrl: m.thumbUrl,
    year: m.year,
    quality: m.quality,
    rating: m.rating,
    ageRating: m.ageRating,
    categoryText: m.categoryText,
    countryText: m.countryText,
  }
}

function mapEpisodeItem(ep: any): WatchEpisodeItem {
  return {
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    episodeName: ep.episodeName,
    episodeSlug: ep.episodeSlug,
    title: ep.title,
    thumbnailUrl: ep.thumbnailUrl,
    duration: ep.duration,
    isActive: ep.isActive,
  }
}

async function buildCurrentEpisode(
  episodeId: string,
  allEpisodes: any[],
  movieId: string,
): Promise<WatchCurrentEpisode | null> {
  const episode = await repo.findEpisodeWithSources(episodeId)
  if (!episode) return null

  // Build sources — priority: hls > mp4 > iframe
  const sources: WatchVideoSource[] = []

  // VideoSource records
  for (const src of episode.videoSources) {
    if (!isValidUrl(src.url)) continue
    if (src.sourceType === 'hls' && !isHlsUrl(src.url)) continue
    sources.push({
      id: src.id,
      sourceType: src.sourceType as 'hls' | 'mp4' | 'iframe',
      url: src.url,
      label: src.label,
      isPrimary: src.isPrimary,
      mimeType: src.mimeType,
      priority: src.priority,
    })
  }

  // Fallback: legacy streamUrl
  if (sources.length === 0 && episode.streamUrl && isValidUrl(episode.streamUrl)) {
    const type = episode.streamType === 'hls' ? 'hls' : 'mp4' as const
    if (type === 'hls' && !isHlsUrl(episode.streamUrl)) {
      // Skip invalid HLS
    } else {
      sources.push({
        id: `legacy-${episode.id}`,
        sourceType: type,
        url: episode.streamUrl,
        label: episode.quality || 'Main',
        isPrimary: true,
        mimeType: type === 'hls' ? 'application/x-mpegURL' : 'video/mp4',
        priority: 1,
      })
    }
  }

  // Sort by source priority: hls first, then mp4, then iframe
  const sourceOrder: Record<string, number> = { hls: 0, mp4: 1, iframe: 2 }
  sources.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    const orderA = sourceOrder[a.sourceType] ?? 3
    const orderB = sourceOrder[b.sourceType] ?? 3
    if (orderA !== orderB) return orderA - orderB
    return b.priority - a.priority
  })

  // Subtitles
  const subtitles: WatchSubtitle[] = []
  for (const sub of episode.subtitleTracks) {
    if (!isValidUrl(sub.url)) continue
    subtitles.push({
      id: sub.id,
      label: sub.label,
      lang: sub.lang,
      url: sub.url,
      isDefault: sub.isDefault,
      kind: sub.kind,
    })
  }

  // Fallback subtitle
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

  // Prev/Next
  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode.id)
  const prevEp = currentIndex > 0 ? mapEpisodeItem(allEpisodes[currentIndex - 1]) : null
  const nextEp = currentIndex >= 0 && currentIndex < allEpisodes.length - 1
    ? mapEpisodeItem(allEpisodes[currentIndex + 1])
    : null

  // Build multi-server list
  const servers = await buildServers(movieId, episode.episodeNumber)

  const primarySource = sources.find((s) => s.isPrimary) || sources[0] || null

  return {
    episode: mapEpisodeItem(episode),
    sources,
    primarySource,
    subtitles,
    nextEpisode: nextEp,
    prevEpisode: prevEp,
    servers,
  }
}

async function buildServers(movieId: string, episodeNumber: number): Promise<WatchServer[]> {
  const episodes = await repo.findEpisodesWithSources(movieId)
  const serverMap = new Map<string, { name: string; slug: string; url: string }[]>()

  for (const ep of episodes) {
    const serverName = ep.serverName || 'Server 1'
    const epName = ep.episodeName || `Tập ${ep.episodeNumber}`
    const epSlug = ep.episodeSlug || `tap-${ep.episodeNumber}`

    let streamUrl: string | null = null

    // Try VideoSource records first
    for (const src of ep.videoSources) {
      if (!isValidUrl(src.url)) continue
      if (src.sourceType === 'hls' && !isHlsUrl(src.url)) continue
      streamUrl = src.url
      break
    }

    // Fallback to legacy streamUrl
    if (!streamUrl && ep.streamUrl && isValidUrl(ep.streamUrl)) {
      if (ep.streamType === 'hls' && !isHlsUrl(ep.streamUrl)) continue
      streamUrl = ep.streamUrl
    }

    if (streamUrl) {
      if (!serverMap.has(serverName)) serverMap.set(serverName, [])
      serverMap.get(serverName)!.push({ name: epName, slug: epSlug, url: streamUrl })
    }
  }

  return Array.from(serverMap.entries())
    .filter(([, eps]) => eps.length > 0)
    .map(([name, episodes]) => ({ name, episodes }))
}
