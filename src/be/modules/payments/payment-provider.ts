// ============================================
// Payments — Provider Abstraction
// ============================================
// A pluggable contract so new gateways (Momo, ZaloPay, …) can be added without
// touching the routes/controller. The first implementation is SePay (VietQR);
// see providers/sepay.provider.ts and provider-registry.ts.
//
// To add a provider:
//   1. Create providers/<name>.provider.ts implementing PaymentProvider.
//   2. Register it in provider-registry.ts.
//   3. Add a webhook route that calls getPaymentProvider('<name>').handleWebhook.

import type { WebhookResult } from './payments.service'

export type { WebhookResult }

/** Result of creating a top-up order (provider-specific payload, e.g. QR data). */
export interface CreateOrderResult {
  orderId: string
  [key: string]: unknown
}

export interface PaymentProvider {
  /** Stable machine id, e.g. 'sepay'. */
  readonly id: string
  /** Human label, e.g. 'SePay (VietQR)'. */
  readonly label: string

  /** Create a top-up order / payment intent for a TCoin package. */
  createOrder(userId: string, packageId: string): Promise<CreateOrderResult>

  /** Process an incoming webhook from this provider's bank/gateway. */
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>
}
