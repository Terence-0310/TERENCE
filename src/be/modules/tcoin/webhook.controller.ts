import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { ok, serverError, unauthorized } from '@/src/be/shared/api-handler'
import { markOrderPaid } from '@/src/be/services/topup-order.service'

export class WebhookController {
  static async handleSepayWebhook(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const secret = process.env.SEPAY_WEBHOOK_SECRET

    // Xác thực webhook secret
    if (secret && authHeader !== `Apikey ${secret}` && authHeader !== `Bearer ${secret}`) {
      return unauthorized('Invalid Webhook Secret')
    }

    try {
      const payload = await req.json()
      
      // Tạo bản ghi log webhook ngay lập tức để audit
      const log = await prisma.bankWebhookLog.create({
        data: {
          provider: 'SEPAY',
          eventType: payload.transferType || 'unknown',
          rawPayload: payload,
          signature: authHeader || '',
          processed: false,
        }
      })

      // Chỉ xử lý giao dịch nhận tiền (transferType = "in")
      if (payload.transferType !== 'in') {
        await prisma.bankWebhookLog.update({
          where: { id: log.id },
          data: { error: 'Ignored: transferType is not "in"', processed: true }
        })
        return ok({ message: 'Ignored non-in transfer' })
      }

      const content = (payload.content || '').toUpperCase()
      const amount = Number(payload.transferAmount || 0)
      const txnId = String(payload.id || '')

      // Tìm mã đơn hàng trong nội dung chuyển khoản (TCOIN_XXXXXX)
      const match = content.match(/TCOIN_[A-Z0-9]+/)
      if (!match) {
        await prisma.bankWebhookLog.update({
          where: { id: log.id },
          data: { error: 'No matching order code in content', processed: true, transactionId: txnId }
        })
        return ok({ message: 'Ignored: No order code in content' })
      }

      const fullCode = match[0]
      const orderCode = fullCode.split('_')[1] // Lấy XXXXXX từ TCOIN_XXXXXX

      await prisma.bankWebhookLog.update({
        where: { id: log.id },
        data: { orderCode, transactionId: txnId }
      })

      // Lấy đơn hàng tương ứng
      const order = await prisma.topupOrder.findUnique({
        where: { code: orderCode }
      })

      if (!order) {
        await prisma.bankWebhookLog.update({
          where: { id: log.id },
          data: { error: 'Order not found', processed: true }
        })
        return ok({ message: 'Ignored: Order not found' })
      }

      if (order.status !== 'PENDING') {
        await prisma.bankWebhookLog.update({
          where: { id: log.id },
          data: { error: `Order status is ${order.status}`, processed: true }
        })
        return ok({ message: 'Ignored: Order already processed or expired' })
      }

      // Kiểm tra số tiền
      if (amount < order.amountVnd) {
        await prisma.bankWebhookLog.update({
          where: { id: log.id },
          data: { error: `Insufficient amount: received ${amount}, required ${order.amountVnd}`, processed: true }
        })
        return ok({ message: 'Ignored: Insufficient amount' })
      }

      // Thực hiện cấp phát TCoin và đổi trạng thái đơn
      await markOrderPaid(order.id, {
        matchedBankTxnId: txnId,
        matchedBankAccount: String(payload.accountNumber || ''),
        matchedBankAmount: amount,
        matchedBankContent: content,
        provider: 'SEPAY',
        rawPayload: payload
      })

      // Đánh dấu webhook log đã xử lý thành công
      await prisma.bankWebhookLog.update({
        where: { id: log.id },
        data: { processed: true, error: null }
      })

      return ok({ success: true, message: 'Webhook processed successfully' })
    } catch (e: any) {
      console.error('[WebhookController] Error processing SePay webhook:', e)
      return serverError('Webhook processing failed')
    }
  }
}
