// ============================================
// POST /api/payments/sepay/webhook
// SePay bank transfer webhook handler.
// Verifies signature, matches pending TopupOrder,
// marks order PAID, and credits user wallet.
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { PaymentsService } from '@/src/be/modules/payments/payments.service'
import { logger } from '@/src/be/shared/utils/logger'
import { prisma } from '@/src/be/shared/db/prisma'

export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'sepay-webhook' })

// GET — friendly status page so an admin visiting the webhook URL in a browser
// gets context instead of a bare 405. Does NOT expose the API key, only whether
// one is configured and when the last successful webhook fired.
export async function GET() {
  const apiKeySet = !!process.env.SEPAY_WEBHOOK_API_KEY
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT || null
  const prefix = process.env.SEPAY_PAYMENT_PREFIX || 'TCOIN'

  const lastPaid = await prisma.topupOrder.findFirst({
    where: { status: 'PAID' },
    orderBy: { paidAt: 'desc' },
    select: { paidAt: true, code: true, amountVnd: true },
  }).catch(() => null)

  const lastWebhook = await prisma.bankWebhookLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, provider: true, processed: true, orderCode: true, error: true },
  }).catch(() => null)

  return NextResponse.json({
    endpoint: '/api/payments/sepay/webhook',
    method: 'POST only — SePay servers post here on each incoming bank transfer',
    note: 'Truy cập trang này bằng trình duyệt sẽ luôn báo "đang hoạt động" nhưng không có giao diện thanh toán. SePay sẽ tự gọi POST khi có chuyển khoản.',
    config: {
      apiKey: apiKeySet ? 'configured' : 'MISSING — set SEPAY_WEBHOOK_API_KEY',
      bankAccount,
      transferPrefix: prefix,
    },
    lastSuccessfulPayment: lastPaid,
    lastWebhookReceived: lastWebhook,
    now: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  // Outer try/catch ensures unexpected errors are logged and returned as a stable
  // JSON response. SePay retries on 5xx — we use 200 for "duplicate / ignored",
  // 400 for bad payload, 401 for bad signature, 500 only for genuine server errors.
  try {
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch (err) {
      log.warn({ err: err instanceof Error ? err.message : err }, 'Failed to read SePay webhook body')
      return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
    }

    // Pass the full Headers object — verifySePayAuth() inspects both
    // Authorization (Apikey / Bearer / raw) and x-api-key shapes.
    const result = await PaymentsService.processSePayWebhook(rawBody, request.headers)

    if (!result.ok) {
      // Map service result to a stable status:
      // - 200: duplicate / already processed / non-matching → don't trigger retry
      // - 400: invalid payload
      // - 401: bad signature
      // - 500: genuine server failure
      const status = result.status
      if (status >= 500) {
        log.error({ status, message: result.message }, 'SePay webhook server error')
      } else if (status === 401) {
        log.warn({ status, message: result.message }, 'SePay webhook signature failure')
      } else {
        log.info({ status, message: result.message }, 'SePay webhook non-success')
      }
      return NextResponse.json({ ok: false, error: result.message }, { status })
    }

    log.info({ orderId: result.orderId }, 'SePay webhook processed')
    return NextResponse.json({ ok: true, orderId: result.orderId })
  } catch (err) {
    // Never leak secrets; pino redact handles common secret keys. Return a stable 500.
    log.error({ err: err instanceof Error ? err.message : err }, 'SePay webhook unhandled error')
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
