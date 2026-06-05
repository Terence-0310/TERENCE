// ============================================
// Payments — Provider Registry
// ============================================
// Central lookup for payment providers. SePay is registered by default;
// future gateways (Momo, ZaloPay, …) register here and become available to
// routes/UI without further wiring.

import type { PaymentProvider } from './payment-provider'
import { SePayProvider } from './providers/sepay.provider'

const registry = new Map<string, PaymentProvider>()

export function registerPaymentProvider(provider: PaymentProvider): void {
  registry.set(provider.id, provider)
}

/** Get a provider by id, or throw if it isn't registered. */
export function getPaymentProvider(id: string): PaymentProvider {
  const provider = registry.get(id)
  if (!provider) throw new Error(`Unknown payment provider: ${id}`)
  return provider
}

/** List registered providers (id + label) for UI/selection. */
export function listPaymentProviders(): Array<{ id: string; label: string }> {
  return Array.from(registry.values()).map((p) => ({ id: p.id, label: p.label }))
}

export const DEFAULT_PROVIDER_ID = 'sepay'

// ── Default registrations ──
registerPaymentProvider(new SePayProvider())
