import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { ok, serverError, unauthorized } from '@/src/be/shared/api-handler'
import { markOrderPaid } from '@/src/be/services/topup-order.service'
import { logger } from '@/src/be/shared/utils/logger'
import { verifySePayAuth, extractOrderCode, SEPAY_LOG_TAGS } from '@/src/be/modules/payments/sepay'

const log = logger.child({ module: 'tcoin-webhook-controller' })

export class WebhookController {
  /**
   * POST /api/webhooks/sepay (legacy path; mirror of /api/payments/sepay/webhook).
   *
   * Returns:
   *   200 — success or "ignored" (so SePay never retries on idempotent skips).
   *   401 — bad / missing auth.
   *   500 — server error (SePay will retry; the order is still PENDING).
   */
  static async handleSepayWebhook(req: NextRequest) {
    // 1) AUTH — accept Authorization: Apikey/Bearer/<raw> or x-api-key.
    if (!verifySePayAuth(req.headers)) {
      log.warn({ tag: SEPAY_LOG_TAGS.UNAUTHORIZED }, 'SePay webhook rejected: bad credentials')
      return unauthorized('Invalid Webhook Secret')
    }

    try {
      const payload = await req.json()
      // Normalise field names — SePay variants use different keys depending
      // on the integration version: id / referenceCode / transactionId,
      // transferAmount / amount, content / description.
      const txnIdRaw = payload.id ?? payload.referenceCode ?? payload.transactionId ?? ''
      const txnId = String(txnIdRaw)
      const amount = Number(payload.transferAmount ?? payload.amount ?? 0)
      const content = String(payload.content ?? payload.description ?? '').trim()
      const transferType = payload.transferType ?? 'in'

      log.info({
        tag: SEPAY_LOG_TAGS.RECEIVED,
        txnId,
        amount,
        transferType,
        // content can be long; truncate to 120 chars and never log the secret.
        contentPreview: content.slice(0, 120),
      }, 'SePay webhook received')

      // 2) Persist raw payload for audit BEFORE any processing.
      const webhookLog = await prisma.bankWebhookLog.create({
        data: {
          provider: 'SEPAY',
          eventType: transferType,
          rawPayload: payload as object,
          // We intentionally don't store the full auth header (would be a
          // secret leak). Store only its presence.
          signature: req.headers.get('authorization') ? '(redacted: present)' : '(missing)',
          processed: false,
          transactionId: txnId || null,
        },
      })

      // 3) Skip outgoing transfers.
      if (transferType !== 'in') {
        await prisma.bankWebhookLog.update({
          where: { id: webhookLog.id },
          data: { error: 'Ignored: transferType is not "in"', processed: true },
        })
        log.info({ tag: SEPAY_LOG_TAGS.IGNORED, transferType }, 'Ignored non-in transfer')
        return ok({ success: true, message: 'Ignored non-in transfer' })
      }

      // 4) Extract order code from content.
      const fullCode = extractOrderCode(content)
      if (!fullCode) {
        await prisma.bankWebhookLog.update({
          where: { id: webhookLog.id },
          data: { error: 'No matching order code in content', processed: true },
        })
        log.warn({ tag: SEPAY_LOG_TAGS.IGNORED, txnId }, 'No TCOIN_ code in content')
        return ok({ success: true, message: 'Ignored: no order code in content' })
      }

      await prisma.bankWebhookLog.update({
        where: { id: webhookLog.id },
        data: { orderCode: fullCode, transactionId: txnId || null },
      })

      // 5) Find the order. We match by `transferContent` (full TCOIN_xxx)
      //    rather than the order's short code, because the new free-amount
      //    flow stores codes like TCOIN_<u6>_<ts> that include underscores.
      const order = await prisma.topupOrder.findFirst({
        where: { transferContent: fullCode },
      })

      if (!order) {
        await prisma.bankWebhookLog.update({
          where: { id: webhookLog.id },
          data: { error: 'Order not found', processed: true },
        })
        log.warn({ tag: SEPAY_LOG_TAGS.NOT_FOUND, code: fullCode }, 'Order not found')
        return ok({ success: true, message: 'Ignored: order not found' })
      }

      // 6) Idempotency — already paid (likely a webhook retry).
      if (order.status === 'PAID' && order.matchedBankTxnId === txnId) {
        log.info({ tag: SEPAY_LOG_TAGS.DUPLICATE, orderId: order.id, txnId }, 'Duplicate webhook (already paid)')
        return ok({ success: true, message: 'Already paid' })
      }
      if (order.status !== 'PENDING') {
        await prisma.bankWebhookLog.update({
          where: { id: webhookLog.id },
          data: { error: `Order status is ${order.status}`, processed: true },
        })
        log.info({ tag: SEPAY_LOG_TAGS.IGNORED, orderId: order.id, status: order.status }, 'Order not in PENDING state')
        return ok({ success: true, message: `Ignored: order is ${order.status}` })
      }

      // 7) Amount guard — refuse short payments. Log the discrepancy.
      if (amount < order.amountVnd) {
        await prisma.bankWebhookLog.update({
          where: { id: webhookLog.id },
          data: { error: `Insufficient amount: received ${amount}, required ${order.amountVnd}`, processed: true },
        })
        log.warn({
          tag: SEPAY_LOG_TAGS.AMOUNT_BAD,
          orderId: order.id,
          received: amount,
          required: order.amountVnd,
        }, 'Amount lower than order total — not crediting')
        return ok({ success: true, message: 'Ignored: insufficient amount' })
      }

      // 8) Credit. `markOrderPaid` wraps everything in $transaction:
      //    - update order to PAID
      //    - credit wallet
      //    - write WalletTransaction audit row
      //    - is idempotent via `matchedBankTxnId @unique`
      await markOrderPaid(order.id, {
        matchedBankTxnId: txnId,
        matchedBankAccount: String(payload.accountNumber ?? ''),
        matchedBankAmount: amount,
        matchedBankContent: content,
        provider: 'SEPAY',
        rawPayload: payload,
      })

      await prisma.bankWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, error: null },
      })

      log.info({
        tag: SEPAY_LOG_TAGS.PAID,
        orderId: order.id,
        userId: order.userId,
        txnId,
        amount,
      }, 'SePay payment credited')

      return ok({ success: true, message: 'Webhook processed successfully' })
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      log.error({ tag: SEPAY_LOG_TAGS.ERROR, err }, 'Error processing SePay webhook')
      return serverError('Webhook processing failed')
    }
  }
}
