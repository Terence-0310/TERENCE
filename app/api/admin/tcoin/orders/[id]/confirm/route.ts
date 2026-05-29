// POST /api/admin/tcoin/orders/[id]/confirm
// Admin: manually mark a PENDING top-up order as PAID (and credit the wallet).
// Used when SePay reconciliation didn't fire (e.g. wrong transfer content).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'
import { markOrderPaid } from '@/src/be/services/topup-order.service'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-tcoin-confirm-order' })

const confirmSchema = z.object({
  // Free-text note shown in audit log. Optional.
  note: z.string().trim().max(500).optional(),
}).strict()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin('payment.update')
  if (auth instanceof NextResponse) return auth

  const adminId = auth.user.id
  const { id } = await params

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { note } = parsed.data

  // Accept either order ID or order code. Codes are unique per row.
  let order = await prisma.topupOrder.findUnique({ where: { id } })
  if (!order) {
    order = await prisma.topupOrder.findUnique({ where: { code: id } })
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status === 'PAID') {
    return NextResponse.json({ ok: true, alreadyPaid: true, orderId: order.id })
  }
  if (order.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Cannot confirm order in status: ${order.status}` },
      { status: 400 },
    )
  }

  try {
    await markOrderPaid(order.id, {
      matchedBankTxnId: `admin-${adminId}-${Date.now()}`,
      matchedBankAccount: '',
      matchedBankAmount: order.amountVnd,
      matchedBankContent: order.transferContent,
      provider: 'ADMIN_MANUAL',
      rawPayload: { confirmedBy: adminId, note: note ?? null, at: new Date().toISOString() },
    })
    log.info({ orderId: order.id, adminId, note }, 'Admin manually confirmed order')
    return NextResponse.json({ ok: true, orderId: order.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ orderId: order.id, adminId, err: message }, 'Admin confirm failed')
    return NextResponse.json({ error: message || 'Confirm failed' }, { status: 500 })
  }
}
