// ============================================
// POST /api/v1/watch-history/complete — Mark movie/episode as completed
// ============================================
// Consolidated from /api/watch/complete

import { NextRequest, NextResponse } from 'next/server'
import { markComplete } from '@/src/be/modules/watch/watch.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'watch-history-complete' })

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
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

  await markComplete(userId, movieId, episodeId || null)

  // Award TCoin for watch completion (fire-and-forget — failures must not block completion)
  import('@/src/be/modules/tcoin/tcoin.service')
    .then(({ rewardWatchComplete }) => rewardWatchComplete(userId, movieId))
    .catch((err) => {
      log.error({ userId, movieId, err: err instanceof Error ? err.message : err }, 'rewardWatchComplete failed')
    })

  return NextResponse.json({ ok: true })
}
