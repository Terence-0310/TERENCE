// ============================================
// POST /api/ads/events
// Body: { adId, event: 'skip'|'complete'|'click', placement? }
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recordAdEvent } from '@/src/be/modules/ads/ads.service'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set(['skip', 'complete', 'click'])

export async function POST(req: NextRequest) {
  let body: { adId?: string; event?: string; placement?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.adId || !body.event || !ALLOWED_EVENTS.has(body.event)) {
    return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  void recordAdEvent(body.adId, body.event as 'skip' | 'complete' | 'click', session?.user?.id, body.placement)
  return NextResponse.json({ ok: true })
}
