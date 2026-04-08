// POST /api/admin/tcoin/adjust
// Admin: manually adjust a user's TCoin balance

import { NextRequest, NextResponse } from 'next/server'
import { adminAdjust } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { targetUserId, amount, reason } = body
  if (!targetUserId || !amount || !reason) {
    return NextResponse.json(
      { error: 'targetUserId, amount, and reason are required' },
      { status: 400 },
    )
  }

  try {
    const result = await adminAdjust(targetUserId, Number(amount), reason, session.userId)
    return NextResponse.json({
      ok: true,
      balance: result.wallet.balance,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
      },
    })
  } catch (e: any) {
    if (e.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Số dư không đủ để trừ' }, { status: 400 })
    }
    throw e
  }
}
