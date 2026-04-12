// GET /api/tcoin/wallet
// Returns wallet info for authenticated user

import { NextResponse } from 'next/server'
import { getWallet } from '@/src/be/modules/tcoin/tcoin.service'
import { AuthService } from '@/src/be/modules/auth'

export async function GET() {
  const session = await AuthService.getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWallet(session.userId)
  return NextResponse.json(wallet)
}
