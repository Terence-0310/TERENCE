// POST /api/tcoin/spend
// Spend TCoins on a predefined option

import { NextRequest, NextResponse } from 'next/server'
import { spendTcoins } from '@/src/be/modules/tcoin/tcoin.service'
import { AuthService } from '@/src/be/modules/auth'

export async function POST(request: NextRequest) {
  const session = await AuthService.getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { optionId } = body
  if (!optionId) {
    return NextResponse.json({ error: 'optionId is required' }, { status: 400 })
  }

  const result = await spendTcoins(session.userId, optionId)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
