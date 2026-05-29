// ============================================
// SePay payload + auth helpers
// ============================================
// Centralised so both webhook endpoints (/api/payments/sepay/webhook and
// /api/webhooks/sepay) share the same verification + parsing logic.

export interface SePayWebhookPayload {
  id: number | string
  gateway?: string
  transactionDate?: string
  accountNumber?: string
  subAccount?: string | null
  transferType: 'in' | 'out'
  transferAmount: number
  accumulated?: number
  code?: string | null
  content?: string
  referenceCode?: string | null
  description?: string
}

/**
 * Get the configured webhook secret. Reads SEPAY_WEBHOOK_API_KEY first
 * (the variable name documented in the SePay onboarding playbook) and
 * falls back to SEPAY_WEBHOOK_SECRET for backward compatibility with the
 * earlier deployment of this project.
 */
function getWebhookSecret(): string {
  return process.env.SEPAY_WEBHOOK_API_KEY || process.env.SEPAY_WEBHOOK_SECRET || ''
}

/**
 * Verify the request is from SePay by checking either:
 *   - `Authorization: Apikey <secret>`
 *   - `Authorization: Bearer <secret>`
 *   - `Authorization: <secret>` (raw)
 *   - `x-api-key: <secret>`
 *
 * Returns true when no secret is configured (development convenience —
 * NEVER deploy to production without setting SEPAY_WEBHOOK_API_KEY).
 */
export function verifySePayAuth(headers: Headers | Record<string, string | null | undefined>): boolean {
  const secret = getWebhookSecret()
  if (!secret) return true

  const getHeader = (name: string): string =>
    headers instanceof Headers
      ? (headers.get(name) ?? '')
      : (headers[name] ?? headers[name.toLowerCase()] ?? '') as string

  const authHeader = getHeader('authorization') || getHeader('Authorization')
  const apiKeyHeader = getHeader('x-api-key') || getHeader('X-Api-Key')

  // Authorization: Apikey <secret> | Bearer <secret> | <secret>
  if (authHeader === `Apikey ${secret}`) return true
  if (authHeader === `Bearer ${secret}`) return true
  if (authHeader === secret) return true

  // x-api-key: <secret>
  if (apiKeyHeader === secret) return true

  return false
}

/**
 * @deprecated Use `verifySePayAuth(req.headers)` instead. Kept so legacy
 * callers (PaymentsService.processSePayWebhook) continue to compile.
 * `signature` here is the Authorization header value passed by the caller.
 */
export function verifySePaySignature(_payload: unknown, signature: string | null): boolean {
  const secret = getWebhookSecret()
  if (!secret) return true
  if (!signature) return false
  if (signature === `Apikey ${secret}`) return true
  if (signature === `Bearer ${secret}`) return true
  if (signature === secret) return true
  return false
}

/**
 * Extract a TCOIN_ order code from the bank transfer content. SePay's
 * `content` field can mix the code with arbitrary user-typed text, so we
 * match a lenient pattern: `TCOIN_` followed by 1+ alphanumeric / `_-`.
 *
 * Returns null when no code is found.
 */
export function extractOrderCode(content: string | null | undefined): string | null {
  if (!content) return null
  const m = content.match(/TCOIN_[A-Za-z0-9_-]+/i)
  return m ? m[0].toUpperCase() : null
}

/**
 * Structured log tags used by both webhook endpoints. Keeping them as
 * constants here makes filtering in pino-pretty / log aggregators trivial.
 */
export const SEPAY_LOG_TAGS = {
  RECEIVED:    'SEPAY_WEBHOOK_RECEIVED',
  NOT_FOUND:   'SEPAY_PAYMENT_NOT_FOUND',
  AMOUNT_BAD:  'SEPAY_AMOUNT_INVALID',
  PAID:        'SEPAY_PAYMENT_PAID',
  DUPLICATE:   'SEPAY_DUPLICATE_TRANSACTION',
  ERROR:       'SEPAY_WEBHOOK_ERROR',
  IGNORED:     'SEPAY_WEBHOOK_IGNORED',
  UNAUTHORIZED:'SEPAY_WEBHOOK_UNAUTHORIZED',
} as const
