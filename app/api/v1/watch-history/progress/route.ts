// ============================================
// POST /api/v1/watch-history/progress — Save watch progress
// ============================================
// Consolidated from /api/watch/progress + /api/v1/progress

import { NextRequest, NextResponse } from 'next/server'
import { saveProgress } from '@/src/be/modules/watch/watch.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

  const { movieId, episodeId, currentTime, duration, deviceType } = body

  if (!movieId || typeof currentTime !== 'number' || typeof duration !== 'number') {
    return NextResponse.json(
      { error: 'movieId, currentTime, and duration are required' },
      { status: 400 },
    )
  }

  // Throttle: don't save if less than 5 seconds
  if (currentTime < 5) {
    return NextResponse.json({ ok: true, progress: 0, isCompleted: false })
  }

  const result = await saveProgress(userId, {
    movieId,
    episodeId: episodeId || null,
    currentTime,
    duration,
    deviceType,
  })

  return NextResponse.json(result)
}
