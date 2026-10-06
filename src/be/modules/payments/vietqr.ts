/**
 * Bank QR URL builders — SePay + VietQR.
 *
 * Single source of truth for "which bank / which account does this site
 * accept money to". Both QR providers (qr.sepay.vn and img.vietqr.io) and
 * the FE bank-info block read from the same `getBankConfig()`, so flipping
 * `SEPAY_BANK_CODE` in `.env` is enough to switch the entire payment flow
 * to a different bank — no code changes needed.
 *
 * Precedence:
 *   1. SEPAY_BANK_CODE  / SEPAY_BANK_ACCOUNT       (preferred)
 *   2. VIETQR_BANK_ID   / VIETQR_ACCOUNT_NO        (legacy)
 *   3. Hard-coded `MBBank` / empty                 (last-resort default)
 *
 * The hard-coded fallback used to be VietinBank (970415 / 100600272094),
 * which leaked the original dev account into QR codes when env was missing.
 * It's now `MBBank` so a misconfigured env at least produces an obviously-
 * different default rather than a real bank account.
 */

const VIETQR_TEMPLATE = process.env.VIETQR_TEMPLATE || 'compact2'

/**
 * Read bank config from env. Called every time a QR is built so a runtime
 * env change (e.g. operator hot-rotating SEPAY_BANK_ACCOUNT) takes effect
 * without restarting the process.
 */
function getBankConfig() {
  // SEPAY_* wins. VIETQR_* is legacy fallback so older deployments still work.
  const bankCode    = process.env.SEPAY_BANK_CODE    || process.env.VIETQR_BANK_ID    || 'MBBank'
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT || process.env.VIETQR_ACCOUNT_NO || ''
  const accountName = process.env.VIETQR_ACCOUNT_NAME || ''
  return { bankCode, bankAccount, accountName }
}

/**
 * Log the active bank config (account number truncated to last 4 digits so
 * the full PAN never lands in the log stream). Called from every QR build
 * so misconfigurations show up immediately in production logs.
 */
function logQrConfig(bankCode: string, bankAccount: string) {
  // eslint-disable-next-line no-console
  console.log('SEPAY_QR_CONFIG', {
    bankCode,
    bankAccountLast4: bankAccount?.slice(-4) || '(none)',
  })
}

export interface VietQrConfig {
  amount: number
  transferContent: string
}

/**
 * SePay-direct QR (`qr.sepay.vn`) — the PRIMARY QR used by the new SePay
 * flow. SePay's reconciliation engine recognises this URL and can match
 * incoming bank transfers automatically.
 */
export function buildSepayQrImageUrl({ amount, transferContent }: VietQrConfig): string {
  const { bankCode, bankAccount } = getBankConfig()
  logQrConfig(bankCode, bankAccount)

  const params = new URLSearchParams({
    bank: bankCode,
    acc: bankAccount,
    amount: amount.toString(),
    des: transferContent,
    template: 'compact',
  })
  return `https://qr.sepay.vn/img?${params.toString()}`
}

/**
 * VietQR fallback (`img.vietqr.io`). Kept for backward compatibility with
 * callers that still expect the VietQR PNG URL shape. Internally reads the
 * same getBankConfig() so SEPAY_BANK_CODE flips this URL too.
 */
export function buildVietQrImageUrl({ amount, transferContent }: VietQrConfig): string {
  const { bankCode, bankAccount, accountName } = getBankConfig()
  logQrConfig(bankCode, bankAccount)

  // img.vietqr.io accepts either the BIN (970415, 970422 ...) or the
  // short bank name (MBBank, VCB, ACB ...) in the same path slot.
  const baseUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-${VIETQR_TEMPLATE}.png`

  const params = new URLSearchParams({
    amount: amount.toString(),
    addInfo: transferContent,
    accountName,
  })
  return `${baseUrl}?${params.toString()}`
}

/**
 * Returns the static bank info block surfaced to the FE so the user can
 * copy/paste the bank, account number, account name and transfer note
 * instead of (or in addition to) scanning the QR code.
 */
export function buildTransferInstructions(transferContent: string) {
  const { bankCode, bankAccount, accountName } = getBankConfig()
  return {
    bankCode,
    accountNo: bankAccount,
    accountName,
    // Must be the exact content stored on the order — the webhook matches
    // incoming transfers against it (see sepay.ts extractOrderCode).
    transferContent,
  }
}

/** Public re-export so callers don't have to re-read env themselves. */
export function getActiveBankConfig() {
  return getBankConfig()
}
