// ============================================
// Watch History Service — Backward-Compatibility Wrapper
// ============================================
// @deprecated This file is a backward-compatibility wrapper.
// The canonical server-side watch history service is at:
//   src/server/watch/watch-history-service.ts
//
// Write operations (saveProgress) delegate to the canonical service
// to ensure a single write path for data consistency.
//
// Read operations (getProgress, getContinueWatching) maintain their
// own response shape because existing API consumers depend on the
// current return types (WatchProgressData, ContinueWatchingItem).
//
// Sprint 2: Unified write path through canonical service.
// Future: Migrate API routes to import canonical service directly.

import { prisma } from '@/lib/db'
import { upsertWatchProgress } from '@/src/server/watch/watch-history-service'
import type { WatchProgressData, ContinueWatchingItem } from '@/lib/player/types'

/**
 * Save or update watch progress for a user.
 * Delegates to the canonical upsertWatchProgress service for data consistency.
 *
 * @deprecated Import upsertWatchProgress from '@/src/server/watch/watch-history-service' directly.
 */
export async function saveProgress(params: {
  userId: string
  movieId: string
  episodeId: string | null
  progressSeconds: number
  durationSeconds: number
}): Promise<WatchProgressData> {
  const { userId, movieId, episodeId, progressSeconds, durationSeconds } = params

  // Delegate write to canonical service (single write path)
  const result = await upsertWatchProgress({
    userId,
    movieId,
    episodeId,
    currentTime: progressSeconds,
    duration: durationSeconds,
  })

  // Map canonical response to legacy WatchProgressData shape
  return {
    movieId: result.movieId,
    episodeId: result.episodeId,
    progressSeconds: result.currentTime ?? 0,
    durationSeconds: result.duration ?? 0,
    percent: result.progress,
    completed: result.isCompleted,
    lastWatchedAt: result.lastWatchedAt,
  }
}

/**
 * Get watch progress for a specific movie/episode.
 * Kept as a direct query — the canonical module doesn't expose
 * an equivalent function with this return shape.
 */
export async function getProgress(params: {
  userId: string
  movieId: string
  episodeId?: string | null
}): Promise<WatchProgressData | null> {
  const { userId, movieId, episodeId } = params

  const wh = await prisma.watchHistory.findFirst({
    where: {
      userId,
      movieId,
      episodeId: episodeId ?? null,
    },
  })

  if (!wh) return null

  return {
    movieId: wh.movieId,
    episodeId: wh.episodeId,
    progressSeconds: wh.currentTime ?? 0,
    durationSeconds: wh.duration ?? 0,
    percent: wh.progress,
    completed: wh.isCompleted,
    lastWatchedAt: wh.lastWatchedAt.toISOString(),
  }
}

/**
 * Get continue watching list for a user.
 * Kept with its own query + response mapping because the return shape
 * (ContinueWatchingItem with full movie/episode objects) differs from
 * the canonical service's WatchHistoryItem type.
 */
export async function getContinueWatching(
  userId: string,
  limit = 20,
): Promise<ContinueWatchingItem[]> {
  const items = await prisma.watchHistory.findMany({
    where: {
      userId,
      isCompleted: false,
      progress: { gt: 2 }, // at least 2%
    },
    orderBy: { lastWatchedAt: 'desc' },
    take: limit,
    include: {
      movie: true,
      episode: true,
    },
  })

  return items
    .filter((item) => item.movie && item.movie.isActive)
    .map((item) => ({
      movie: {
        id: item.movie.id,
        tmdbId: item.movie.tmdbId,
        slug: item.movie.slug,
        title: item.movie.title,
        originalTitle: item.movie.originalTitle,
        description: item.movie.description,
        contentType: item.movie.contentType,
        posterUrl: item.movie.posterUrl,
        backdropUrl: item.movie.backdropUrl,
        year: item.movie.year,
        quality: item.movie.quality,
        rating: item.movie.rating,
        categoryText: item.movie.categoryText,
        directorText: item.movie.directorText,
        actorText: item.movie.actorText,
        countryText: item.movie.countryText,
      },
      episode: item.episode
        ? {
            id: item.episode.id,
            episodeNumber: item.episode.episodeNumber,
            episodeName: item.episode.episodeName,
            episodeSlug: item.episode.episodeSlug,
            title: item.episode.title,
            description: item.episode.description ?? null,
            thumbnailUrl: item.episode.thumbnailUrl ?? null,
            duration: item.episode.duration,
            isActive: item.episode.isActive,
          }
        : null,
      progress: {
        movieId: item.movieId,
        episodeId: item.episodeId,
        progressSeconds: item.currentTime ?? 0,
        durationSeconds: item.duration ?? 0,
        percent: item.progress,
        completed: item.isCompleted,
        lastWatchedAt: item.lastWatchedAt.toISOString(),
      },
    }))
}
