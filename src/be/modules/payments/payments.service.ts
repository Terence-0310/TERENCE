// ============================================
// Payments Module — Service
// Business logic for payment processing.
// Currently supports VietQR + SePay webhook.
// ============================================

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'
import {
  SePayWebhookPayload,
  verifySePayAuth,
  extractOrderCode,
  SEPAY_LOG_TAGS,
} from './sepay'
import { markOrderPaid, createBankQrOrder, getOrderById, expireStaleOrders } from '@/src/be/services/topup-order.service'

const log = logger.child({ module: 'payments-service' })

export type WebhookResult =
  | { ok: true; orderId: string }
  | { ok: false; status: number; message: string }

export class PaymentsService {
  /**
   * Process a SePay bank webhook:
   *   1. Verify auth header (Apikey / Bearer / x-api-key).
   *   2. Parse + log payload.
   *   3. Ignore non-incoming transfers (returns 200 so SePay doesn't retry).
   *   4. Match against a pending order via transferContent (TCOIN_xxx).
   *   5. Atomically mark order PAID + credit wallet via `markOrderPaid()`,
   *      which is idempotent (matchedBankTxnId @unique guards duplicates).
   *
   * Status code policy:
   *   - 200 on duplicates / no match / "ignored" so SePay stops retrying.
   *   - 400 on malformed JSON.
   *   - 401 on bad credentials.
   *   - 500 only on genuine server errors (lets SePay retry).
   */
  static async processSePayWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    if (!verifySePayAuth(headers)) {
      log.warn({ tag: SEPAY_LOG_TAGS.UNAUTHORIZED }, 'SePay webhook rejected: bad credentials')
      return { ok: false, status: 401, message: 'Invalid signature' }
    }

    let payload: SePayWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return { ok: false, status: 400, message: 'Invalid JSON payload' }
    }

    const txnId = String(payload.id ?? payload.referenceCode ?? '')
    const amount = Number(payload.transferAmount ?? 0)
    const content = String(payload.content ?? payload.description ?? '').trim()

    log.info({
      tag: SEPAY_LOG_TAGS.RECEIVED,
      txnId,
      amount,
      transferType: payload.transferType,
      contentPreview: content.slice(0, 120),
    }, 'SePay webhook received')

    // Audit log — store the raw payload but never the secret.
    await prisma.bankWebhookLog.create({
      data: {
        provider: 'SEPAY',
        rawPayload: payload as object,
        // Just record that the request had an Authorization header — never
        // store its value (would be a secret leak in the DB).
        signature: headers.get('authorization') ? '(redacted: present)' : '(missing)',
        eventType: payload.transferType,
        transactionId: txnId || null,
        processed: false,
      },
    })

    if (payload.transferType !== 'in') {
      log.info({ tag: SEPAY_LOG_TAGS.IGNORED, transferType: payload.transferType }, 'Ignored non-in transfer')
      return { ok: false, status: 200, message: 'Ignored non-in transfer' }
    }

    const orderCode = extractOrderCode(content)
    if (!orderCode) {
      log.warn({ tag: SEPAY_LOG_TAGS.IGNORED, txnId }, 'No TCOIN_ code in content')
      return { ok: false, status: 200, message: 'No order code in content' }
    }

    const matchedOrder = await PaymentsService.findMatchingOrder(orderCode, amount)
    if (!matchedOrder) {
      log.warn({ tag: SEPAY_LOG_TAGS.NOT_FOUND, code: orderCode, amount }, 'No PENDING order matched')
      return { ok: false, status: 200, message: 'No matching order found' }
    }

    // Already-paid short-circuit (idempotency).
    if (matchedOrder.status === 'PAID' && matchedOrder.matchedBankTxnId === txnId) {
      log.info({ tag: SEPAY_LOG_TAGS.DUPLICATE, orderId: matchedOrder.id, txnId }, 'Duplicate webhook')
      return { ok: true, orderId: matchedOrder.id }
    }

    try {
      await markOrderPaid(matchedOrder.id, {
        matchedBankTxnId: txnId,
        matchedBankAccount: String(payload.accountNumber ?? ''),
        matchedBankAmount: amount,
        matchedBankContent: content,
        provider: 'SEPAY',
        rawPayload: payload,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // Unique-constraint hit on matchedBankTxnId means a concurrent webhook
      // already credited the same txn — safe to report success.
      if (message.includes('Unique constraint') || message.toLowerCase().includes('unique')) {
        log.info({ tag: SEPAY_LOG_TAGS.DUPLICATE, orderId: matchedOrder.id, txnId }, 'Concurrent duplicate webhook')
        return { ok: true, orderId: matchedOrder.id }
      }
      throw err
    }

    log.info({
      tag: SEPAY_LOG_TAGS.PAID,
      orderId: matchedOrder.id,
      userId: matchedOrder.userId,
      txnId,
      amount,
    }, 'SePay payment credited')

    return { ok: true, orderId: matchedOrder.id }
  }

  /**
   * Find a PENDING (or already-PAID matching) order whose transferContent
   * matches the extracted code. Amount must be >= order total — if the user
   * over-paid we still credit, but never under-pay.
   */
  private static async findMatchingOrder(orderCode: string, amount: number) {
    const order = await prisma.topupOrder.findFirst({
      where: { transferContent: orderCode },
    })
    if (!order) return null
    if (amount < order.amountVnd) {
      log.warn({
        tag: SEPAY_LOG_TAGS.AMOUNT_BAD,
        orderId: order.id,
        received: amount,
        required: order.amountVnd,
      }, 'Underpaid — not credited')
      return null
    }
    return order
  }

  static async createQrOrder(userId: string, packageId: string) {
    return createBankQrOrder(userId, packageId)
  }

  static async getOrder(id: string) {
    return getOrderById(id)
  }

  static async expireStaleOrders() {
    return expireStaleOrders()
  }
}
