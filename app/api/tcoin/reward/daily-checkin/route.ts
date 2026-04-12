// POST /api/tcoin/reward/daily-checkin
// Claims daily check-in reward

import { NextResponse } from 'next/server'
import { claimDailyCheckin } from '@/src/be/modules/tcoin/tcoin.service'
import { AuthService } from '@/src/be/modules/auth'

export async function POST() {
  const session = await AuthService.getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await claimDailyCheckin(session.userId)
  return NextResponse.json(result)
}
