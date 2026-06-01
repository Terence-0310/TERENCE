// ============================================
// GET /api/payments/sepay/status/[id] — poll order status
// ============================================
// Returns only the fields the FE polling loop needs. Permission gate:
// users may only see their own orders. The webhook updates `status` to
// PAID once SePay confirms the transfer.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'sepay-status' })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // `id` from the URL may be either the order's `id` (cuid) or its `code`
    // (TCOIN_xxx). Accept both — the FE uses paymentId, the user might paste a code.
    let order = await prisma.topupOrder.findUnique({ where: { id } })
    if (!order) {
      order = await prisma.topupOrder.findUnique({ where: { code: id } })
    }

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    if (order.userId !== userId) {
      // Don't leak existence — same 404 as missing.
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Active reconciliation against SePay's API while still PENDING — confirms
    // the payment (credit + receipt email) even when the push webhook hasn't
    // arrived. Best-effort: any failure falls through to the stored status.
    if (order.status === 'PENDING') {
      try {
        const { reconcileOrderViaApi } = await import('@/src/be/modules/payments/sepay-api')
        const updated = await reconcileOrderViaApi(order)
        if (updated) order = updated
      } catch {
        /* ignore — return stored status */
      }
    }

    return NextResponse.json({
      success: true,
      status: order.status,
      amount: order.amountVnd,
      tcoinAmount: order.coinAmount + order.bonusAmount,
      paidAt: order.paidAt,
      expiresAt: order.expiresAt,
    })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'status check failed')
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
