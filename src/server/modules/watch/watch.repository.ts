// ============================================
// Watch Module — Repository (DB layer)
// ============================================
// Direct Prisma access for watch-related data.
// Only this file touches prisma in the watch module.

import { prisma } from '@/src/server/shared/db/prisma'

// ═══════════ Movie + Episode queries ═══════════

export async function findMovieBySlug(slug: string) {
  return prisma.movie.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
    },
  })
}

export async function findActiveEpisodes(movieId: string) {
  return prisma.episode.findMany({
    where: {
      movieId,
      isActive: true,
      isPublished: true,
      status: 'active',
    },
    orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
  })
}

export async function findEpisodeWithSources(episodeId: string) {
  return prisma.episode.findFirst({
    where: { id: episodeId, isActive: true },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
      },
      subtitleTracks: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }],
      },
    },
  })
}

export async function findEpisodesWithSources(movieId: string) {
  return prisma.episode.findMany({
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
}

// ═══════════ Watch History / Progress ═══════════

export async function findWatchProgress(userId: string, movieId: string, episodeId?: string | null) {
  return prisma.watchHistory.findFirst({
    where: {
      userId,
      movieId,
      ...(episodeId ? { episodeId } : {}),
    },
    orderBy: { lastWatchedAt: 'desc' },
  })
}

export async function findLatestMovieProgress(userId: string, movieId: string) {
  return prisma.watchHistory.findFirst({
    where: { userId, movieId },
    orderBy: { lastWatchedAt: 'desc' },
  })
}

export async function upsertWatchProgress(data: {
  userId: string
  movieId: string
  episodeId: string | null
  currentTime: number
  duration: number
  progress: number
  isCompleted: boolean
  deviceType?: string
}) {
  const existing = await prisma.watchHistory.findFirst({
    where: {
      userId: data.userId,
      movieId: data.movieId,
      episodeId: data.episodeId,
    },
  })

  if (existing) {
    return prisma.watchHistory.update({
      where: { id: existing.id },
      data: {
        currentTime: data.currentTime,
        duration: data.duration,
        progress: data.progress,
        isCompleted: data.isCompleted,
        lastWatchedAt: new Date(),
        deviceType: data.deviceType ?? existing.deviceType,
      },
    })
  }

  return prisma.watchHistory.create({
    data: {
      userId: data.userId,
      movieId: data.movieId,
      episodeId: data.episodeId,
      currentTime: data.currentTime,
      duration: data.duration,
      progress: data.progress,
      isCompleted: data.isCompleted,
      lastWatchedAt: new Date(),
      deviceType: data.deviceType,
    },
  })
}

export async function markWatchCompleted(userId: string, movieId: string, episodeId?: string | null) {
  const existing = await prisma.watchHistory.findFirst({
    where: {
      userId,
      movieId,
      ...(episodeId ? { episodeId } : {}),
    },
  })

  if (existing) {
    return prisma.watchHistory.update({
      where: { id: existing.id },
      data: {
        isCompleted: true,
        progress: 100,
        lastWatchedAt: new Date(),
      },
    })
  }

  return prisma.watchHistory.create({
    data: {
      userId,
      movieId,
      episodeId: episodeId ?? null,
      isCompleted: true,
      progress: 100,
      lastWatchedAt: new Date(),
    },
  })
}

export async function getContinueWatchingItems(userId: string, limit: number = 20) {
  // Get all non-completed watch records, grouped by movie (latest per movie)
  const records = await prisma.watchHistory.findMany({
    where: {
      userId,
      isCompleted: false,
      progress: { gt: 2, lt: 95 }, // Between 2% and 95%
      currentTime: { gt: 15 }, // At least 15 seconds watched
    },
    include: {
      movie: {
        select: {
          id: true,
          slug: true,
          title: true,
          posterUrl: true,
          backdropUrl: true,
          thumbUrl: true,
          contentType: true,
          year: true,
          quality: true,
          isActive: true,
        },
      },
      episode: {
        select: {
          id: true,
          episodeNumber: true,
          episodeName: true,
          episodeSlug: true,
        },
      },
    },
    orderBy: { lastWatchedAt: 'desc' },
    take: limit * 2, // Fetch extra to account for per-movie dedup
  })

  // Deduplicate: only the most recent episode per movie
  const movieMap = new Map<string, typeof records[0]>()
  for (const record of records) {
    if (!record.movie?.isActive) continue
    if (!movieMap.has(record.movieId)) {
      movieMap.set(record.movieId, record)
    }
  }

  return Array.from(movieMap.values()).slice(0, limit)
}

// ═══════════ View count ═══════════

export async function incrementMovieViewCount(movieId: string) {
  return prisma.movie.update({
    where: { id: movieId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null) // Non-critical
}

export async function incrementEpisodeViewCount(episodeId: string) {
  return prisma.episode.update({
    where: { id: episodeId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null) // Non-critical
}
