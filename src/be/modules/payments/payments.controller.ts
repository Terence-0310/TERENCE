import { NextResponse } from 'next/server'
import { PaymentsService } from './payments.service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'payments-controller' })

export class PaymentsController {
  static async handleSePayWebhook(req: Request) {
    try {
      const rawBody = await req.text()
      // Pass the full Headers — verifySePayAuth() inspects multiple shapes
      // (Authorization: Apikey/Bearer/raw, x-api-key).
      const result = await PaymentsService.processSePayWebhook(rawBody, req.headers)

      if (!result.ok) {
        return NextResponse.json({ message: result.message }, { status: result.status })
      }

      return NextResponse.json({ success: true, orderId: result.orderId })
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'Webhook handler error')
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}
