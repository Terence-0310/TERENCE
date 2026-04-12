// ============================================
// GET  /api/v1/watch-history — List watch history
// POST /api/v1/watch-history — Upsert watch progress
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/src/be/modules/auth'
import {
  getWatchHistory,
  getContinueWatching,
  upsertWatchProgress,
} from '@/src/be/modules/watch/watch-history-service'
import { apiSuccess, apiError } from '@/src/be/shared/api-response'

// ─── Auth Helper ────────────────────────────────────────────────

async function requireUser() {
  const session = await AuthService.getSession()
  if (!session?.user?.id) return null
  return session.user
}

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
    console.error('[API] /v1/watch-history GET error:', error)
    return apiError('Internal Server Error', 500)
  }
}

// ─── POST: Upsert watch progress ────────────────────────────────

// Write Cache to throttle DB writes (30 seconds per user-movie)
const writeCache = new Map<string, number>()
const THROTTLE_MS = 30000

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

    // --- DEBOUNCE / THROTTLE PATTERN ---
    // Prevent hitting the Database if less than 30s have passed since last write for this user+movie.
    const cacheKey = `${user.id}:${body.movieId}:${body.episodeId || 'null'}`
    const now = Date.now()
    const lastWrite = writeCache.get(cacheKey)

    if (lastWrite && now - lastWrite < THROTTLE_MS) {
      // Return early; frontend will be content. The localStorage on client is the primary source of truth anyway.
      return apiSuccess({ status: 'debounced', message: 'Write skipped to reduce DB load' })
    }

    // Update cache
    writeCache.set(cacheKey, now)
    
    // Prevent Map memory leaks on long-running worker
    if (writeCache.size > 50000) writeCache.clear()

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

    if (status === 500) console.error('[API] /v1/watch-history POST error:', error)

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
