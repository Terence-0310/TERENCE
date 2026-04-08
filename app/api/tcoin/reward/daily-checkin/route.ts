// POST /api/tcoin/reward/daily-checkin
// Claims daily check-in reward

import { NextResponse } from 'next/server'
import { claimDailyCheckin } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await claimDailyCheckin(session.userId)
  return NextResponse.json(result)
}
