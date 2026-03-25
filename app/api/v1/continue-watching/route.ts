// ============================================
// GET /api/v1/continue-watching — Continue watching list
// ============================================

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getContinueWatching } from '@/server/services/watch-history-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getContinueWatching(session.user.id, 20)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[API] continue-watching error:', error)
    return NextResponse.json({ error: 'Failed to get continue watching' }, { status: 500 })
  }
}
