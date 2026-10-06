// ============================================
// SePay payload + auth helpers
// ============================================
// Centralised so both webhook endpoints (/api/payments/sepay/webhook and
// /api/webhooks/sepay) share the same verification + parsing logic.

import { timingSafeEqual } from 'crypto'

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
 * No secret configured: allowed only outside production (local testing).
 * In production the webhook fails CLOSED so a forged POST cannot credit TCoin.
 */
function allowWithoutSecret(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/** Constant-time string comparison (avoids leaking the secret via timing). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** True when the header value carries the secret as `Apikey x`, `Bearer x` or raw `x`. */
function matchesSecret(value: string, secret: string): boolean {
  if (!value) return false
  return (
    safeEqual(value, `Apikey ${secret}`) ||
    safeEqual(value, `Bearer ${secret}`) ||
    safeEqual(value, secret)
  )
}

/**
 * Verify the request is from SePay by checking either:
 *   - `Authorization: Apikey <secret>`
 *   - `Authorization: Bearer <secret>`
 *   - `Authorization: <secret>` (raw)
 *   - `x-api-key: <secret>`
 *
 * Without a configured secret this returns true only outside production.
 */
export function verifySePayAuth(headers: Headers | Record<string, string | null | undefined>): boolean {
  const secret = getWebhookSecret()
  if (!secret) return allowWithoutSecret()

  const getHeader = (name: string): string =>
    headers instanceof Headers
      ? (headers.get(name) ?? '')
      : (headers[name] ?? headers[name.toLowerCase()] ?? '') as string

  const authHeader = getHeader('authorization') || getHeader('Authorization')
  const apiKeyHeader = getHeader('x-api-key') || getHeader('X-Api-Key')

  return matchesSecret(authHeader, secret) || (!!apiKeyHeader && safeEqual(apiKeyHeader, secret))
}

/**
 * @deprecated Use `verifySePayAuth(req.headers)` instead. Kept so legacy
 * callers (PaymentsService.processSePayWebhook) continue to compile.
 * `signature` here is the Authorization header value passed by the caller.
 */
export function verifySePaySignature(_payload: unknown, signature: string | null): boolean {
  const secret = getWebhookSecret()
  if (!secret) return allowWithoutSecret()
  if (!signature) return false
  return matchesSecret(signature, secret)
}

/**
 * Extract a TCOIN order code from the bank transfer content. SePay's
 * `content` field mixes the code with arbitrary bank-appended text, AND many
 * Vietnamese banks (MBBank, VCB ...) STRIP underscores/spaces from the memo —
 * so a transfer of `TCOIN_PDFYZ3SE` arrives as `TCOINPDFYZ3SE`. The underscore
 * is therefore optional here.
 *
 * Returns the matched token UPPERCASED but otherwise raw (e.g. `TCOINPDFYZ3SE`
 * or `TCOIN_PDFYZ3SE`). For reliable comparison use `contentMatchesTransfer`,
 * which normalises both sides. Returns null when no token is found.
 */
export function extractOrderCode(content: string | null | undefined): string | null {
  if (!content) return null
  const m = content.match(/TCOIN_?[A-Za-z0-9][A-Za-z0-9_-]*/i)
  return m ? m[0].toUpperCase() : null
}

/**
 * Uppercase + keep only A-Z0-9. Banks routinely strip underscores, spaces and
 * punctuation from the transfer memo, so normalising both the bank content and
 * the stored transferContent before comparing is the only reliable match.
 */
export function normalizeBankContent(s: string | null | undefined): string {
  return (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * True when a raw bank transfer content corresponds to an order's stored
 * `transferContent`, tolerant of stripped underscores/spaces. e.g. content
 * "TCOINPDFYZ3SE Ma giao dich..." matches stored "TCOIN_PDFYZ3SE".
 */
export function contentMatchesTransfer(
  bankContent: string | null | undefined,
  transferContent: string | null | undefined,
): boolean {
  const target = normalizeBankContent(transferContent)
  if (target.length === 0) return false
  return normalizeBankContent(bankContent).includes(target)
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
