// ============================================
// POST /api/payments/sepay/create — free-amount top-up
// ============================================
// Used by the new SePay direct flow. User picks any VND amount (instead of
// choosing a fixed package) and gets a QR + bank info back. The webhook at
// /api/payments/sepay/webhook reconciles the transfer automatically.
//
// The existing package-based flow at /api/tcoin/topup/create-bank-order
// still works untouched — this endpoint sits beside it.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFreeAmountOrder, expireStaleOrders } from '@/src/be/services/topup-order.service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'sepay-create' })

const createSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'amount must be a number' })
    .int('amount must be an integer (VND)')
    .positive('amount must be > 0'),
}).strict()

export async function POST(req: NextRequest) {
  // 1) Auth — only logged-in users may create top-up orders.
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Parse + validate body.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  // 3) Garbage-collect stale orders in the background (best-effort, non-blocking).
  expireStaleOrders().catch(() => {})

  // 4) Create the order.
  try {
    const order = await createFreeAmountOrder(userId, parsed.data.amount)
    return NextResponse.json({
      success: true,
      paymentId: order.paymentId,
      code: order.code,
      amount: order.amount,
      tcoinAmount: order.tcoinAmount,
      qrUrl: order.qrUrl,
      qrUrlVietQr: order.qrUrlVietQr,
      transferContent: order.transferContent,
      expiresAt: order.expiresAt,
      bankInfo: order.bankInfo,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ err: message, userId }, 'createFreeAmountOrder failed')
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
