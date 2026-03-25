// ============================================
// POST/GET /api/v1/progress — Save/Load watch progress
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { saveProgress, getProgress } from '@/server/services/watch-history-service'

/**
 * POST — Save watch progress
 * Body: { movieId, episodeId?, progressSeconds, durationSeconds }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized — use localStorage instead' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { movieId, episodeId, progressSeconds, durationSeconds } = body

  if (!movieId || typeof progressSeconds !== 'number' || typeof durationSeconds !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (durationSeconds <= 0 || progressSeconds < 0) {
    return NextResponse.json({ error: 'Invalid progress values' }, { status: 400 })
  }

  try {
    const result = await saveProgress({
      userId: session.user.id,
      movieId,
      episodeId: episodeId || null,
      progressSeconds,
      durationSeconds,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] progress save error:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

/**
 * GET — Get watch progress
 * Query: ?movieId=xxx&episodeId=xxx
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const movieId = req.nextUrl.searchParams.get('movieId')
  const episodeId = req.nextUrl.searchParams.get('episodeId')

  if (!movieId) {
    return NextResponse.json({ error: 'movieId is required' }, { status: 400 })
  }

  try {
    const result = await getProgress({
      userId: session.user.id,
      movieId,
      episodeId: episodeId || null,
    })
    return NextResponse.json(result || { progressSeconds: 0, durationSeconds: 0, percent: 0, completed: false })
  } catch (error) {
    console.error('[API] progress get error:', error)
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 })
  }
}
