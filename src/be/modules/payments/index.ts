// ============================================
// Payments Module — Barrel Export
// ============================================
// Live payment path: VietQR + SePay bank webhook. The SePay flow is implemented
// directly in PaymentsService — there is no generic provider abstraction.

export { PaymentsService } from './payments.service'
export type { WebhookResult } from './payments.service'
export { PaymentsController } from './payments.controller'

// Pluggable provider abstraction (SePay + future Momo/ZaloPay).
export type { PaymentProvider, CreateOrderResult } from './payment-provider'
export {
  getPaymentProvider,
  listPaymentProviders,
  registerPaymentProvider,
  DEFAULT_PROVIDER_ID,
} from './provider-registry'
