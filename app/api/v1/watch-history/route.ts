// ============================================
// GET  /api/v1/watch-history — List watch history
// POST /api/v1/watch-history — Upsert watch progress
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import {
  getWatchHistory,
  getContinueWatching,
  upsertWatchProgress,
} from '@/src/server/watch/watch-history-service'

// ─── Auth Helper ────────────────────────────────────────────────

async function requireUser() {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session.user
}

// ─── GET: List watch history or continue watching ───────────────

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const mode = sp.get('mode') // 'continue' | 'history' (default)

    if (mode === 'continue') {
      const limit = Math.min(Math.max(parseInt(sp.get('limit') || '10', 10), 1), 30)
      const items = await getContinueWatching(user.id, limit)

      return NextResponse.json({
        success: true,
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
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

// ─── POST: Upsert watch progress ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.movieId || typeof body.movieId !== 'string') {
      return NextResponse.json({ success: false, error: 'movieId is required' }, { status: 400 })
    }

    if (body.currentTime !== undefined && (typeof body.currentTime !== 'number' || body.currentTime < 0)) {
      return NextResponse.json({ success: false, error: 'currentTime must be a non-negative number' }, { status: 400 })
    }

    if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration < 0)) {
      return NextResponse.json({ success: false, error: 'duration must be a non-negative number' }, { status: 400 })
    }

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

    return NextResponse.json({
      success: true,
      data: item,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = ['Movie not found', 'Episode not found', 'Episode does not belong'].some(m => message.includes(m)) ? 400 : 500

    if (status === 500) console.error('[API] /v1/watch-history POST error:', error)

    return NextResponse.json({ success: false, error: message }, { status })
  }
}

// ─── Device Detection ───────────────────────────────────────────

function detectDeviceType(ua: string): string {
  if (/SmartTV|SMART-TV|TV/i.test(ua)) return 'tv'
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile'
  return 'desktop'
}
