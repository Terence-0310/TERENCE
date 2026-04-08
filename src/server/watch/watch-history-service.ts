// ============================================
// Watch History Service
// ============================================
// Handles watch progress tracking, history listing, and continue watching.

import { prisma } from '@/lib/db/prisma'

// ─── Types ──────────────────────────────────────────────────────

export interface UpsertWatchInput {
  userId: string
  movieId: string
  episodeId?: string | null
  currentTime?: number   // seconds
  duration?: number      // seconds
  progressPercent?: number // 0–100
  deviceType?: string
  ipAddress?: string
}

export interface WatchHistoryItem {
  id: string
  movieId: string
  episodeId: string | null
  currentTime: number | null
  duration: number | null
  progress: number
  isCompleted: boolean
  lastWatchedAt: string
  updatedAt: string
  movie: {
    id: string
    slug: string
    title: string
    thumbUrl: string | null
    posterUrl: string | null
    contentType: string
    episodeCurrent: string | null
    episodeTotal: number | null
  }
  episode: {
    id: string
    episodeName: string | null
    episodeSlug: string | null
    episodeNumber: number
    serverName: string | null
  } | null
  resumeUrl: string
}

// ─── Constants ──────────────────────────────────────────────────

const COMPLETED_THRESHOLD = 90 // Mark as completed when progress >= 90%

// ─── Upsert Watch Progress ──────────────────────────────────────

export async function upsertWatchProgress(input: UpsertWatchInput): Promise<WatchHistoryItem> {
  const { userId, movieId, episodeId, currentTime, duration, deviceType, ipAddress } = input

  // Validate
  if (!movieId) throw new Error('movieId is required')
  if (currentTime !== undefined && currentTime < 0) throw new Error('currentTime must be >= 0')
  if (duration !== undefined && duration < 0) throw new Error('duration must be >= 0')

  // Verify movie exists
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true },
  })
  if (!movie) throw new Error('Movie not found')

  // Verify episode if provided
  if (episodeId) {
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, movieId: true },
    })
    if (!episode) throw new Error('Episode not found')
    if (episode.movieId !== movieId) throw new Error('Episode does not belong to this movie')
  }

  // Calculate progress
  let progress = input.progressPercent ?? 0
  if (currentTime !== undefined && duration && duration > 0) {
    progress = Math.min(100, Math.round((currentTime / duration) * 100))
  }
  const isCompleted = progress >= COMPLETED_THRESHOLD

  const now = new Date()
  const epId = episodeId || null

  // Manual upsert: composite unique with nullable field needs findFirst + create/update pattern
  const includeRelations = {
    movie: {
      select: {
        id: true, slug: true, title: true,
        thumbUrl: true, posterUrl: true, contentType: true,
        episodeCurrent: true, episodeTotal: true,
      },
    },
    episode: {
      select: {
        id: true, episodeName: true, episodeSlug: true,
        episodeNumber: true, serverName: true,
      },
    },
  }

  // Find existing record
  const existing = await prisma.watchHistory.findFirst({
    where: { userId, movieId, episodeId: epId },
  })

  let record

  if (existing) {
    record = await prisma.watchHistory.update({
      where: { id: existing.id },
      data: {
        currentTime: currentTime ?? existing.currentTime,
        duration: duration ?? existing.duration,
        progress,
        isCompleted,
        deviceType: deviceType ?? existing.deviceType,
        ipAddress: ipAddress ?? existing.ipAddress,
        lastWatchedAt: now,
      },
      include: includeRelations,
    })
  } else {
    record = await prisma.watchHistory.create({
      data: {
        userId,
        movieId,
        episodeId: epId,
        currentTime: currentTime ?? null,
        duration: duration ?? null,
        progress,
        isCompleted,
        deviceType: deviceType ?? null,
        ipAddress: ipAddress ?? null,
        watchedAt: now,
        lastWatchedAt: now,
      },
      include: includeRelations,
    })
  }

  return formatWatchItem(record)
}

// ─── Get Watch History ──────────────────────────────────────────

interface GetHistoryOptions {
  userId: string
  page?: number
  perPage?: number
  completed?: boolean // filter: only completed / only in-progress
}

export async function getWatchHistory(opts: GetHistoryOptions): Promise<{
  items: WatchHistoryItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}> {
  const { userId, page = 1, perPage = 20, completed } = opts
  const skip = (page - 1) * perPage

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId }
  if (completed !== undefined) {
    where.isCompleted = completed
  }

  const [records, total] = await Promise.all([
    prisma.watchHistory.findMany({
      where,
      include: {
        movie: {
          select: {
            id: true, slug: true, title: true,
            thumbUrl: true, posterUrl: true, contentType: true,
            episodeCurrent: true, episodeTotal: true,
          },
        },
        episode: {
          select: {
            id: true, episodeName: true, episodeSlug: true,
            episodeNumber: true, serverName: true,
          },
        },
      },
      orderBy: { lastWatchedAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.watchHistory.count({ where }),
  ])

  return {
    items: records.map(formatWatchItem),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

// ─── Get Continue Watching ──────────────────────────────────────

export async function getContinueWatching(userId: string, limit: number = 10): Promise<WatchHistoryItem[]> {
  const records = await prisma.watchHistory.findMany({
    where: {
      userId,
      isCompleted: false,
      progress: { gt: 0 },
    },
    include: {
      movie: {
        select: {
          id: true, slug: true, title: true,
          thumbUrl: true, posterUrl: true, contentType: true,
          episodeCurrent: true, episodeTotal: true,
        },
      },
      episode: {
        select: {
          id: true, episodeName: true, episodeSlug: true,
          episodeNumber: true, serverName: true,
        },
      },
    },
    orderBy: { lastWatchedAt: 'desc' },
    take: limit,
  })

  return records.map(formatWatchItem)
}

// ─── Delete Watch Record ────────────────────────────────────────

export async function deleteWatchRecord(id: string, userId: string): Promise<boolean> {
  // Verify ownership
  const record = await prisma.watchHistory.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!record) return false
  if (record.userId !== userId) throw new Error('Not authorized to delete this record')

  await prisma.watchHistory.delete({ where: { id } })
  return true
}

// ─── Format Helper ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatWatchItem(record: any): WatchHistoryItem {
  // Build resume URL based on movie slug + episode
  let resumeUrl = `/watch/${record.movie.slug}`
  if (record.episode?.episodeSlug) {
    resumeUrl += `/${record.episode.episodeSlug}`
  }
  if (record.currentTime && record.currentTime > 0) {
    resumeUrl += `?t=${record.currentTime}`
  }

  return {
    id: record.id,
    movieId: record.movieId,
    episodeId: record.episodeId,
    currentTime: record.currentTime,
    duration: record.duration,
    progress: record.progress,
    isCompleted: record.isCompleted,
    lastWatchedAt: record.lastWatchedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    movie: record.movie,
    episode: record.episode,
    resumeUrl,
  }
}
