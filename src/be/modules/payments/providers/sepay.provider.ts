// ============================================
// SePay Payment Provider (VietQR)
// ============================================
// Adapter that exposes the existing SePay/VietQR flow through the generic
// PaymentProvider contract. All business logic stays in PaymentsService;
// this class is a thin binding so SePay is just one of many pluggable gateways.

import { PaymentsService } from '../payments.service'
import type { CreateOrderResult, PaymentProvider, WebhookResult } from '../payment-provider'

export class SePayProvider implements PaymentProvider {
  readonly id = 'sepay'
  readonly label = 'SePay (VietQR)'

  async createOrder(userId: string, packageId: string): Promise<CreateOrderResult> {
    const order = await PaymentsService.createQrOrder(userId, packageId)
    // Spread the QR/order payload but guarantee an `orderId` field.
    return { orderId: (order as { id?: string }).id ?? '', ...(order as object) }
  }

  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    return PaymentsService.processSePayWebhook(rawBody, headers)
  }
}
