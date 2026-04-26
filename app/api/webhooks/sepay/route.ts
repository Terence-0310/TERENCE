import { NextRequest } from 'next/server'
import { WebhookController } from '@/src/be/modules/tcoin/webhook.controller'

// Endpoint: POST /api/webhooks/sepay
export async function POST(req: NextRequest) {
  return WebhookController.handleSepayWebhook(req)
}
