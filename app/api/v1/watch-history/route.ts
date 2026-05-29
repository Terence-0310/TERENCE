// ============================================
// GET  /api/v1/watch-history — List watch history
// POST /api/v1/watch-history — Upsert watch progress
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getWatchHistory,
  getContinueWatching,
  upsertWatchProgress,
} from '@/src/be/modules/watch/watch-history-service'
import { apiSuccess, apiError } from '@/src/be/shared/api-response'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'watch-history' })

// ─── Auth Helper ────────────────────────────────────────────────

async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return { ...session.user }
}

// ─── Write Cache (TTL-based, bounded) ───────────────────────────
// Throttles DB writes to once per THROTTLE_MS per user+movie+episode.
// Uses eviction of the oldest entry when the map exceeds MAX_CACHE_SIZE,
// preventing unbounded memory growth on long-running workers.

class TtlWriteCache {
  private readonly store = new Map<string, number>()
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  isThrottled(key: string, ttlMs: number): boolean {
    const last = this.store.get(key)
    if (last === undefined) return false
    if (Date.now() - last >= ttlMs) {
      this.store.delete(key)
      return false
    }
    return true
  }

  set(key: string): void {
    if (this.store.size >= this.maxSize) {
      // Evict the oldest inserted entry (Map preserves insertion order)
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, Date.now())
  }
}

const writeCache = new TtlWriteCache(10_000)
const THROTTLE_MS = 30_000

// ─── GET: List watch history or continue watching ───────────────

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return apiError('Not authenticated', 401)
    }

    const sp = req.nextUrl.searchParams
    const mode = sp.get('mode') // 'continue' | 'history' (default)

    if (mode === 'continue') {
      const limit = Math.min(Math.max(parseInt(sp.get('limit') || '10', 10), 1), 30)
      const items = await getContinueWatching(user.id, limit)

      return NextResponse.json({
        success: true,
        message: 'OK',
        data: items,
        meta: { mode: 'continue', count: items.length },
      })
    }

    // Default: full history with pagination
    const page = Math.max(parseInt(sp.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(sp.get('perPage') || '20', 10), 1), 50)
    const completedParam = sp.get('completed')
    const completed = completedParam === 'true' ? true : completedParam === 'false' ? false : undefined

    const result = await getWatchHistory({ userId: user.id, page, perPage, completed })

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: result.items,
      pagination: {
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
      },
      meta: { mode: 'history' },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/watch-history GET error')
    return apiError('Internal Server Error', 500)
  }
}

// ─── POST: Upsert watch progress ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return apiError('Not authenticated', 401)
    }

    const body = await req.json()

    // Validate required fields
    if (!body.movieId || typeof body.movieId !== 'string') {
      return apiError('movieId is required', 400)
    }

    if (body.currentTime !== undefined && (typeof body.currentTime !== 'number' || body.currentTime < 0)) {
      return apiError('currentTime must be a non-negative number', 400)
    }

    if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration < 0)) {
      return apiError('duration must be a non-negative number', 400)
    }

    // Throttle: skip DB write if last write for this user+movie was within THROTTLE_MS
    const cacheKey = `${user.id}:${body.movieId}:${body.episodeId ?? 'null'}`

    if (writeCache.isThrottled(cacheKey, THROTTLE_MS)) {
      return apiSuccess({ status: 'debounced', message: 'Write skipped to reduce DB load' })
    }

    writeCache.set(cacheKey)

    // Get client info
    const forwarded = req.headers.get('x-forwarded-for')
    const ipAddress = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
    const ua = req.headers.get('user-agent') || ''
    const deviceType = detectDeviceType(ua)

    const item = await upsertWatchProgress({
      userId: user.id,
      movieId: body.movieId,
      episodeId: body.episodeId || null,
      currentTime: body.currentTime,
      duration: body.duration,
      progressPercent: body.progressPercent,
      deviceType,
      ipAddress,
    })

    return apiSuccess(item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = ['Movie not found', 'Episode not found', 'Episode does not belong'].some(m => message.includes(m)) ? 400 : 500

    if (status === 500) log.error({ err: error instanceof Error ? error.message : error }, '/v1/watch-history POST error')

    return apiError(message, status)
  }
}

// ─── Device Detection ───────────────────────────────────────────

function detectDeviceType(ua: string): string {
  if (/SmartTV|SMART-TV|TV/i.test(ua)) return 'tv'
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile'
  return 'desktop'
}

// ─── DELETE: Remove watch history items ────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return apiError('Not authenticated', 401)
    }

    const sp = req.nextUrl.searchParams
    const movieId = sp.get('movieId')
    const episodeId = sp.get('episodeId')
    const clearAll = sp.get('clearAll')

    if (clearAll === 'true') {
      await prisma.watchHistory.deleteMany({
        where: { userId: user.id }
      })
      return apiSuccess({ deleted: true, message: 'All history cleared' })
    }

    if (movieId) {
      if (episodeId) {
        await prisma.watchHistory.deleteMany({
          where: { userId: user.id, movieId, episodeId }
        })
      } else {
        await prisma.watchHistory.deleteMany({
          where: { userId: user.id, movieId }
        })
      }
      return apiSuccess({ deleted: true, message: 'History removed' })
    }

    return apiError('Invalid request parameters', 400)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/watch-history DELETE error')
    return apiError('Internal Server Error', 500)
  }
}
