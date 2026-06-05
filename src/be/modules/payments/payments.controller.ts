import { NextResponse } from 'next/server'
import { logger } from '@/src/be/shared/utils/logger'
import { getPaymentProvider, DEFAULT_PROVIDER_ID } from './provider-registry'

const log = logger.child({ module: 'payments-controller' })

export class PaymentsController {
  /**
   * Generic webhook handler — resolves the gateway from the provider registry
   * and delegates. Defaults to SePay so the existing /payments/sepay/webhook
   * route keeps working unchanged.
   */
  static async handleWebhook(req: Request, providerId: string = DEFAULT_PROVIDER_ID) {
    try {
      const provider = getPaymentProvider(providerId)
      const rawBody = await req.text()
      // Pass the full Headers — verifySePayAuth() inspects multiple shapes
      // (Authorization: Apikey/Bearer/raw, x-api-key).
      const result = await provider.handleWebhook(rawBody, req.headers)

      if (!result.ok) {
        return NextResponse.json({ message: result.message }, { status: result.status })
      }

      return NextResponse.json({ success: true, orderId: result.orderId })
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error, providerId }, 'Webhook handler error')
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }

  /** Back-compat alias for the SePay-specific route. */
  static handleSePayWebhook(req: Request) {
    return PaymentsController.handleWebhook(req, 'sepay')
  }
}
