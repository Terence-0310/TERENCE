// ============================================
// POST /api/v1/watch-history/complete — Mark movie/episode as completed
// ============================================
// Consolidated from /api/watch/complete

import { NextRequest, NextResponse } from 'next/server'
import { markComplete } from '@/src/be/modules/watch/watch.service'
import { AuthService } from '@/src/be/modules/auth'

export async function POST(request: NextRequest) {
  const session = await AuthService.getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { movieId, episodeId } = body

  if (!movieId) {
    return NextResponse.json(
      { error: 'movieId is required' },
      { status: 400 },
    )
  }

  await markComplete(session.userId, movieId, episodeId || null)

  // Award TCoin for watch completion (fire-and-forget)
  import('@/src/be/modules/tcoin/tcoin.service')
    .then(({ rewardWatchComplete }) => rewardWatchComplete(session.userId, movieId))
    .catch(() => {}) // Non-critical

  return NextResponse.json({ ok: true })
}
