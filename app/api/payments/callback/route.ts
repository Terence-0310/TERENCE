// POST /api/payments/callback
// Processes payment gateway callback (webhook)

import { NextRequest, NextResponse } from 'next/server'
import { processPaymentCallback } from '@/src/server/modules/tcoin/tcoin.service'

export async function POST(request: NextRequest) {
  // NOTE: In production, verify webhook signature from payment provider
  // For now, accept direct calls (for admin manual confirmation).

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, providerTxnId, status } = body

  if (!orderId || !status) {
    return NextResponse.json(
      { error: 'orderId and status are required' },
      { status: 400 },
    )
  }

  if (status !== 'completed' && status !== 'failed') {
    return NextResponse.json(
      { error: 'status must be "completed" or "failed"' },
      { status: 400 },
    )
  }

  try {
    const result = await processPaymentCallback(
      orderId,
      providerTxnId || '',
      status,
    )
    return NextResponse.json(result)
  } catch (e: any) {
    if (e.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 })
    }
    if (e.message === 'ORDER_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Đơn hàng đã được xử lý' }, { status: 409 })
    }
    throw e
  }
}
