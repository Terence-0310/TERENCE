// ============================================
// SePay User API client + active reconciliation
// ============================================
// Companion to the webhook flow. The webhook is PUSH (SePay calls us); this
// module is PULL (we call SePay). It lets a PENDING order be confirmed even
// when the webhook never arrives — e.g. the SePay dashboard webhook URL is
// misconfigured, the server was briefly unreachable, or we're testing on a
// host SePay can't reach.
//
// Docs: https://docs.sepay.vn/tich-hop-api-cong-ty.html
//   GET https://my.sepay.vn/userapi/transactions/list
//   Header: Authorization: Bearer <SEPAY_API_KEY>
//
// Matching reuses the exact same rules as the webhook (extractOrderCode +
// amount guard) and credits via `markOrderPaid`, so wallet credit, realtime
// push and the receipt email all happen identically regardless of which path
// (push or pull) confirmed the payment.

import { logger } from '@/src/be/shared/utils/logger'
import { contentMatchesTransfer } from './sepay'
import { getActiveBankConfig } from './vietqr'
import { markOrderPaid } from '@/src/be/services/topup-order.service'
import type { TopupOrder } from '@prisma/client'

const log = logger.child({ module: 'sepay-api' })

const SEPAY_API_BASE = process.env.SEPAY_API_BASE || 'https://my.sepay.vn'

/** True when a SePay user-API token is configured (polling is possible). */
export function isSepayApiConfigured(): boolean {
  return !!process.env.SEPAY_API_KEY && process.env.SEPAY_API_KEY !== 'your_sepay_api_key_here'
}

// Shape of a single row from /userapi/transactions/list. SePay returns numeric
// fields as strings, so every numeric read goes through Number().
interface SepayApiTransaction {
  id: string | number
  transaction_date: string
  account_number: string | null
  amount_in: string | number
  amount_out: string | number
  transaction_content: string | null
  reference_number: string | null
  code: string | null
}

interface SepayListResponse {
  status: number
  error: string | null
  transactions?: SepayApiTransaction[]
}

/**
 * Fetch recent transactions for the configured receiving account.
 *
 * `sinceDate` (optional) narrows the query to transactions on/after a given
 * time using SePay's `transaction_date_min` filter — we pass the order's
 * creation time so we never scan the whole ledger.
 *
 * Returns [] (never throws) on any network / auth / parse error so callers
 * can treat reconciliation as strictly best-effort.
 */
export async function fetchRecentSepayTransactions(opts?: {
  limit?: number
  sinceDate?: Date
}): Promise<SepayApiTransaction[]> {
  const token = process.env.SEPAY_API_KEY
  if (!token || !isSepayApiConfigured()) {
    log.warn('SePay API polling skipped — SEPAY_API_KEY not configured')
    return []
  }

  const { bankAccount } = getActiveBankConfig()
  const params = new URLSearchParams({ limit: String(opts?.limit ?? 50) })
  if (bankAccount) params.set('account_number', bankAccount)
  if (opts?.sinceDate) {
    // SePay expects "YYYY-MM-DD HH:mm:ss". Build it without locale surprises.
    params.set('transaction_date_min', toSepayDate(opts.sinceDate))
  }

  const url = `${SEPAY_API_BASE}/userapi/transactions/list?${params.toString()}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      // SePay is external — never let a hung request stall the status poll.
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })

    if (!res.ok) {
      log.warn({ status: res.status }, 'SePay API list request failed')
      return []
    }

    const data = (await res.json()) as SepayListResponse
    if (data.status !== 200 && data.error) {
      log.warn({ status: data.status, error: data.error }, 'SePay API returned error')
      return []
    }
    return Array.isArray(data.transactions) ? data.transactions : []
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err }, 'SePay API list fetch error')
    return []
  }
}

/**
 * Try to confirm a single PENDING order by polling SePay's transaction list.
 *
 * Returns:
 *   - the updated (PAID) order when a matching transaction was found + credited
 *   - null when no match was found, the order isn't PENDING, or polling is off
 *
 * Best-effort: any error is swallowed and returns null so the caller (a status
 * poll) always responds. Crediting itself is idempotent (`markOrderPaid` guards
 * on order status + `matchedBankTxnId @unique`), so a webhook landing at the
 * same moment can never double-credit.
 */
export async function reconcileOrderViaApi(order: TopupOrder): Promise<TopupOrder | null> {
  if (order.status !== 'PENDING') return null
  if (!isSepayApiConfigured()) return null

  // Only scan transactions from when the order was created onward (minus a 2h
  // safety margin for clock skew / late settlement) so we never miss it but
  // also never scan months of history.
  const sinceDate = new Date(order.createdAt.getTime() - 2 * 60 * 60 * 1000)
  const txns = await fetchRecentSepayTransactions({ limit: 50, sinceDate })
  if (txns.length === 0) return null

  const match = txns.find((t) => {
    if (!contentMatchesTransfer(t.transaction_content, order.transferContent)) return false
    const amountIn = Number(t.amount_in ?? 0)
    return amountIn >= order.amountVnd
  })
  if (!match) return null

  try {
    const updated = await markOrderPaid(order.id, {
      matchedBankTxnId: String(match.id),
      matchedBankAccount: String(match.account_number ?? ''),
      matchedBankAmount: Number(match.amount_in ?? 0),
      matchedBankContent: String(match.transaction_content ?? ''),
      provider: 'SEPAY_API',
      rawPayload: match as unknown as object,
    })
    log.info({ orderId: order.id, txnId: String(match.id) }, 'Order confirmed via SePay API polling')
    return updated
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // A concurrent webhook/poll may have credited the same txn first — that's
    // a success from our perspective, not a failure.
    if (message.toLowerCase().includes('unique') || message.includes('Cannot pay an order')) {
      log.info({ orderId: order.id }, 'Order already credited concurrently (API poll)')
      return null
    }
    log.error({ orderId: order.id, err: message }, 'reconcileOrderViaApi failed')
    return null
  }
}

/**
 * Batch reconcile every still-open PENDING order (used by the cron route).
 * Fetches the recent transaction window once, then matches each pending order
 * against it — one API call regardless of how many orders are open.
 */
export async function reconcilePendingOrders(): Promise<{ checked: number; confirmed: number }> {
  if (!isSepayApiConfigured()) return { checked: 0, confirmed: 0 }

  const { prisma } = await import('@/src/be/shared/db/prisma')
  const pending = await prisma.topupOrder.findMany({
    where: { status: 'PENDING', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  if (pending.length === 0) return { checked: 0, confirmed: 0 }

  // Window: from the oldest still-open order (minus margin) to now.
  const oldest = pending[0].createdAt
  const txns = await fetchRecentSepayTransactions({
    limit: 100,
    sinceDate: new Date(oldest.getTime() - 2 * 60 * 60 * 1000),
  })
  if (txns.length === 0) return { checked: pending.length, confirmed: 0 }

  let confirmed = 0
  for (const order of pending) {
    const match = txns.find(
      (t) =>
        contentMatchesTransfer(t.transaction_content, order.transferContent) &&
        Number(t.amount_in ?? 0) >= order.amountVnd,
    )
    if (!match) continue
    try {
      await markOrderPaid(order.id, {
        matchedBankTxnId: String(match.id),
        matchedBankAccount: String(match.account_number ?? ''),
        matchedBankAmount: Number(match.amount_in ?? 0),
        matchedBankContent: String(match.transaction_content ?? ''),
        provider: 'SEPAY_API',
        rawPayload: match as unknown as object,
      })
      confirmed++
    } catch {
      // idempotency clash / concurrent credit — skip silently.
    }
  }

  log.info({ checked: pending.length, confirmed }, 'Batch reconcile complete')
  return { checked: pending.length, confirmed }
}

/** Format a Date as SePay's "YYYY-MM-DD HH:mm:ss" (UTC-agnostic local string). */
function toSepayDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}
