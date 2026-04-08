// ============================================
// GET /api/v1/watch-history/bootstrap?movieSlug=...&episode=...
// ============================================
// Returns full watch page bootstrap data (consolidated from /api/watch/bootstrap)

import { NextRequest, NextResponse } from 'next/server'
import { bootstrap } from '@/src/server/modules/watch/watch.service'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const movieSlug = searchParams.get('movieSlug')
  const episode = searchParams.get('episode') || undefined

  if (!movieSlug) {
    return NextResponse.json(
      { error: 'movieSlug is required' },
      { status: 400 },
    )
  }

  // Get user session (optional — for resume progress)
  let userId: string | undefined
  try {
    const session = await getSession()
    userId = session?.userId
  } catch {
    // Not logged in — no resume data
  }

  const data = await bootstrap(movieSlug, episode, userId)

  if (!data) {
    return NextResponse.json(
      { error: 'Movie not found' },
      { status: 404 },
    )
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=30',
    },
  })
}
