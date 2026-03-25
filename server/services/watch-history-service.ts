// ============================================
// Watch History Service — server-side progress persistence
// ============================================

import { prisma } from '@/lib/db'
import type { WatchProgressData, ContinueWatchingItem } from '@/lib/player/types'

/**
 * Save or update watch progress for a user.
 */
export async function saveProgress(params: {
  userId: string
  movieId: string
  episodeId: string | null
  progressSeconds: number
  durationSeconds: number
}): Promise<WatchProgressData> {
  const { userId, movieId, episodeId, progressSeconds, durationSeconds } = params

  // Validate
  if (durationSeconds <= 0 || progressSeconds < 0) {
    throw new Error('Invalid progress data')
  }

  const percent = Math.round((progressSeconds / durationSeconds) * 100)
  const completed = percent >= 90

  // Upsert based on unique constraint (userId, movieId, episodeId)
  const existing = await prisma.watchHistory.findFirst({
    where: { userId, movieId, episodeId: episodeId || null },
  })

  let wh
  if (existing) {
    wh = await prisma.watchHistory.update({
      where: { id: existing.id },
      data: {
        currentTime: Math.floor(progressSeconds),
        duration: Math.floor(durationSeconds),
        progress: percent,
        isCompleted: completed,
        lastWatchedAt: new Date(),
      },
    })
  } else {
    wh = await prisma.watchHistory.create({
      data: {
        userId,
        movieId,
        episodeId: episodeId || null,
        currentTime: Math.floor(progressSeconds),
        duration: Math.floor(durationSeconds),
        progress: percent,
        isCompleted: completed,
        lastWatchedAt: new Date(),
      },
    })
  }

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
 * Get watch progress for a specific movie/episode.
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
