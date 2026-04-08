// ============================================
// POST /api/v1/watch-history/complete — Mark movie/episode as completed
// ============================================
// Consolidated from /api/watch/complete

import { NextRequest, NextResponse } from 'next/server'
import { markComplete } from '@/src/server/modules/watch/watch.service'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
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
  import('@/src/server/modules/tcoin/tcoin.service')
    .then(({ rewardWatchComplete }) => rewardWatchComplete(session.userId, movieId))
    .catch(() => {}) // Non-critical

  return NextResponse.json({ ok: true })
}
