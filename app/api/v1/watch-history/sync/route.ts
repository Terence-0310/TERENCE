// ============================================
// GET  /api/v1/watch-history/sync — Load remote watch history
// POST /api/v1/watch-history/sync — Sync local watch history (last-write-wins merge)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/src/be/shared/db/prisma'
import { apiError } from '@/src/be/shared/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'watch-history-sync' })

// Per-item validation — we still skip-and-log bad items rather than failing
// the entire batch, so a single corrupt local entry doesn't block the sync.
const syncItemSchema = z.object({
  movieId: z.string().min(1),
  episodeId: z.string().optional().nullable(),
  currentTime: z.number().finite().nonnegative().optional(),
  duration: z.number().finite().nonnegative().optional(),
  progressPercent: z.number().finite().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  lastWatchedAt: z.string().min(1),
})
const syncBodySchema = z.object({ items: z.array(z.unknown()) })

type HistoryWithRelations = Awaited<ReturnType<typeof loadHistoriesWithRelations>>[number]

async function loadHistoriesWithRelations(userId: string) {
  return prisma.watchHistory.findMany({
    where: { userId },
    include: { movie: true, episode: true },
  })
}

function toClientItem(h: HistoryWithRelations) {
  return {
    movieId: h.movieId,
    movieSlug: h.movie.slug,
    movieTitle: h.movie.title,
    posterUrl: h.movie.posterUrl || '',
    thumbUrl: h.movie.thumbUrl || '',
    episodeId: h.episodeId || h.movieId,
    episodeName: h.episode?.episodeName || h.episode?.title || 'Full',
    episodeSlug: h.episode?.slug || '',
    serverName: 'Server 1',
    serverIndex: 0,
    episodeIndex: 0,
    currentTime: h.currentTime || 0,
    duration: h.duration || 0,
    progressPercent: h.progress,
    lastWatchedAt: h.lastWatchedAt.toISOString(),
    completed: h.isCompleted,
    sourceUrl: '',
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return apiError('Unauthorized', 401)
    }

    const histories = await loadHistoriesWithRelations(userId)
    return NextResponse.json({ items: histories.map(toClientItem) })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Watch history sync GET error')
    return apiError('Internal Server Error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return apiError('Unauthorized', 401)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('Invalid JSON', 400)
    }

    const parsedBody = syncBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return apiError('Invalid request body', 400)
    }

    // Pre-validate each item, skipping invalid ones with logging.
    type SanitizedItem = {
      movieId: string
      episodeId: string | null
      currentTime: number
      duration: number
      progress: number
      completed: boolean
      lastWatchedAt: Date
    }
    const sanitized: SanitizedItem[] = []
    const rejected: Array<{ index: number; reason: string }> = []
    parsedBody.data.items.forEach((raw, idx) => {
      const r = syncItemSchema.safeParse(raw)
      if (!r.success) {
        rejected.push({ index: idx, reason: r.error.issues[0]?.message ?? 'invalid item' })
        return
      }
      const localTs = new Date(r.data.lastWatchedAt)
      if (Number.isNaN(localTs.getTime())) {
        rejected.push({ index: idx, reason: 'invalid lastWatchedAt' })
        return
      }
      // Normalize: episodeId === movieId means "full movie" pseudo-episode.
      const episodeId = r.data.episodeId && r.data.episodeId !== r.data.movieId ? r.data.episodeId : null
      sanitized.push({
        movieId: r.data.movieId,
        episodeId,
        currentTime: r.data.currentTime ?? 0,
        duration: r.data.duration ?? 0,
        progress: r.data.progressPercent ?? 0,
        completed: Boolean(r.data.completed),
        lastWatchedAt: localTs,
      })
    })

    // Wrap the merge in a single $transaction so a fail in the middle rolls back
    // any partial commits and keeps the watch history consistent.
    await prisma.$transaction(async (tx) => {
      const remote = await tx.watchHistory.findMany({ where: { userId } })
      const keyOf = (movieId: string, episodeId: string | null) => `${movieId}::${episodeId ?? ''}`
      const remoteByKey = new Map<string, (typeof remote)[number]>()
      for (const r of remote) remoteByKey.set(keyOf(r.movieId, r.episodeId), r)

      for (const item of sanitized) {
        const existing = remoteByKey.get(keyOf(item.movieId, item.episodeId))
        const isNewer = !existing || item.lastWatchedAt > existing.lastWatchedAt
        if (!isNewer) continue

        if (existing) {
          await tx.watchHistory.update({
            where: { id: existing.id },
            data: {
              currentTime: item.currentTime || existing.currentTime,
              duration: item.duration || existing.duration,
              progress: item.progress || existing.progress,
              isCompleted: item.completed,
              lastWatchedAt: item.lastWatchedAt,
            },
          })
        } else {
          await tx.watchHistory.create({
            data: {
              userId,
              movieId: item.movieId,
              episodeId: item.episodeId,
              currentTime: item.currentTime,
              duration: item.duration,
              progress: item.progress,
              isCompleted: item.completed,
              lastWatchedAt: item.lastWatchedAt,
              deviceType: 'synced',
            },
          })
        }
      }
    })

    if (rejected.length > 0) {
      log.warn({ userId, rejectedCount: rejected.length, rejected }, 'Watch history sync skipped invalid items')
    }

    // Refetch with relations so the client gets the authoritative merged set —
    // includes remote-only items the client didn't know about (cross-device sync).
    const merged = await loadHistoriesWithRelations(userId)
    return NextResponse.json({
      mergedItems: merged.map(toClientItem),
      rejectedCount: rejected.length,
      rejected: rejected.length > 0 ? rejected : undefined,
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Watch history sync POST error')
    return apiError('Internal Server Error', 500)
  }
}
