// GET /api/tcoin/wallet
// Returns wallet info for authenticated user

import { NextResponse } from 'next/server'
import { getWallet } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWallet(session.userId)
  return NextResponse.json(wallet)
}
