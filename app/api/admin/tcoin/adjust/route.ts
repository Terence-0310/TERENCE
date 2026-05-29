// POST /api/admin/tcoin/adjust
// Admin: manually adjust a user's TCoin balance

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminAdjust } from '@/src/be/modules/tcoin/tcoin.service'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-tcoin-adjust' })

// Strict Zod schema. `amount` must be a finite, non-zero integer
// (business rule: zero adjustments are pointless and previously rejected
// incorrectly by `!amount`).
const adjustSchema = z.object({
  targetUserId: z.string().trim().min(1),
  amount: z
    .number({ invalid_type_error: 'amount must be a number' })
    .finite()
    .int('amount must be an integer')
    .refine((v) => v !== 0, { message: 'amount must be non-zero' }),
  reason: z.string().trim().min(1).max(500),
}).strict()

export async function POST(request: NextRequest) {
  const auth = await requireAdmin('payment.update')
  if (auth instanceof NextResponse) return auth
  const session = { userId: auth.user.id }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = adjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { targetUserId, amount, reason } = parsed.data

  try {
    const result = await adminAdjust(targetUserId, amount, reason, session.userId)
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    if (message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Số dư không đủ để trừ' }, { status: 400 })
    }
    log.error({ err: message, targetUserId, amount }, 'POST /admin/tcoin/adjust error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
