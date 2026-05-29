// ============================================
// GET /api/v1/watch-history/bootstrap?movieSlug=...&episode=...
// ============================================
// Returns full watch page bootstrap data (consolidated from /api/watch/bootstrap)

import { NextRequest, NextResponse } from 'next/server'
import { bootstrap } from '@/src/be/modules/watch/watch.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'watch-history-bootstrap' })

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const movieSlug = searchParams.get('movieSlug')
    const episode = searchParams.get('episode') || undefined

    if (!movieSlug) {
      return NextResponse.json(
        { error: 'movieSlug is required' },
        { status: 400 },
      )
    }

    // Session lookup is optional — anonymous viewers still get bootstrap data,
    // they just won't see resume progress. We log session failures (instead of
    // swallowing silently) so monitoring catches NextAuth misconfigurations.
    let userId: string | undefined
    try {
      const session = await getServerSession(authOptions)
      userId = session?.user?.id
    } catch (sessionErr) {
      log.warn(
        { err: sessionErr instanceof Error ? sessionErr.message : sessionErr },
        'getServerSession failed — continuing as anonymous',
      )
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
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Bootstrap GET failed')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
