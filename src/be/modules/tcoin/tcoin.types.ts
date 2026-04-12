// ============================================
// TCoin Module — Types
// ============================================

// ── Transaction categories ──
export type TransactionCategory =
  | 'daily_checkin'
  | 'watch_reward'
  | 'review_reward'
  | 'referral_reward'
  | 'welcome_bonus'
  | 'admin_adjustment'
  | 'purchase'
  | 'spend'
  | 'refund'
  | 'other'

// ── Reward configuration ──
export interface RewardConfig {
  id: string
  category: TransactionCategory
  amount: number
  label: string
  description: string
  icon: string
  cooldown?: number // ms before user can claim again
  maxPerDay?: number
}

// ── Spend option ──
export interface SpendOption {
  id: string
  name: string
  cost: number
  description: string
  icon: string
  durationDays?: number
}

// ── API: GET /api/tcoin/wallet ──
export interface WalletResponse {
  balance: number
  userId: string
  createdAt: string
  totalEarned: number
  totalSpent: number
}

// ── API: GET /api/tcoin/transactions ──
export interface TransactionItem {
  id: string
  type: string
  category: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  referenceId: string | null
  referenceType: string | null
  createdAt: string
}

export interface TransactionsResponse {
  transactions: TransactionItem[]
  total: number
  page: number
  perPage: number
}

// ── API: POST /api/tcoin/reward/daily-checkin ──
export interface DailyCheckinResponse {
  ok: boolean
  amount: number
  balance: number
  message: string
  nextCheckinAt?: string
}

// ── API: POST /api/tcoin/spend ──
export interface SpendInput {
  optionId: string
}

export interface SpendResponse {
  ok: boolean
  amount: number
  balance: number
  message: string
}

// ── API: POST /api/payments/create-order ──
export interface CreateOrderInput {
  packageId: string
}

export interface CreateOrderResponse {
  ok: boolean
  orderId: string
  amount: number
  tcoins: number
  provider: string
  paymentUrl?: string
}

// ── API: POST /api/payments/callback ──
export interface PaymentCallbackInput {
  orderId: string
  providerTxnId: string
  status: 'completed' | 'failed'
}

// ── Admin types ──
export interface AdminWalletSummary {
  userId: string
  userName: string
  email: string
  balance: number
  totalEarned: number
  totalSpent: number
  transactionCount: number
  lastActivity: string | null
}

export interface AdminPaymentOrder {
  id: string
  userId: string
  userName: string
  amount: number
  currency: string
  tcoins: number
  provider: string | null
  providerTxnId: string | null
  status: string
  paidAt: string | null
  createdAt: string
}
