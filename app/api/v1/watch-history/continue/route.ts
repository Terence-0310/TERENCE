// ============================================
// GET /api/v1/watch-history/continue?limit=20 — Continue watching list
// ============================================
// Consolidated from /api/watch/continue + /api/v1/continue-watching

import { NextRequest, NextResponse } from 'next/server'
import { getContinueWatching } from '@/src/be/modules/watch/watch.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit')) || 20

  const items = await getContinueWatching(userId, Math.min(limit, 50))

  return NextResponse.json({
    items,
    total: items.length,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=10',
    },
  })
}
