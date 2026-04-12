// ============================================
// TCoin Module — Service (business logic)
// ============================================
// All TCoin operations: wallet, rewards, spending, admin.
// This is the ONLY layer API routes should call.

import * as repo from './tcoin.repository'
import type {
  WalletResponse,
  TransactionItem,
  TransactionsResponse,
  DailyCheckinResponse,
  SpendResponse,
  RewardConfig,
  SpendOption,
} from './tcoin.types'

// ═══════════════════════════════════════════════
// REWARD CONFIGS
// ═══════════════════════════════════════════════

export const REWARD_CONFIGS: RewardConfig[] = [
  {
    id: 'daily_checkin',
    category: 'daily_checkin',
    amount: 5,
    label: 'Điểm danh hàng ngày',
    description: 'Nhận 5 TCoin mỗi ngày khi điểm danh',
    icon: '📅',
    maxPerDay: 1,
  },
  {
    id: 'watch_complete',
    category: 'watch_reward',
    amount: 2,
    label: 'Xem phim hoàn tất',
    description: 'Nhận 2 TCoin khi xem xong 1 phim/tập',
    icon: '🎬',
    maxPerDay: 10,
  },
  {
    id: 'write_review',
    category: 'review_reward',
    amount: 10,
    label: 'Viết đánh giá phim',
    description: 'Nhận 10 TCoin khi viết review',
    icon: '✍️',
    maxPerDay: 3,
  },
  {
    id: 'referral',
    category: 'referral_reward',
    amount: 100,
    label: 'Mời bạn bè',
    description: 'Nhận 100 TCoin khi bạn bè đăng ký thành công',
    icon: '👥',
  },
]

export const SPEND_OPTIONS: SpendOption[] = [
  { id: 'remove-ads-7d', name: 'Xóa quảng cáo 7 ngày', cost: 50, description: 'Trải nghiệm không quảng cáo', icon: '🚫', durationDays: 7 },
  { id: 'hd-upgrade', name: 'Nâng HD → Full HD', cost: 30, description: 'Xem phim chất lượng cao hơn', icon: '📺', durationDays: 30 },
  { id: 'early-access', name: 'Xem sớm 24h', cost: 100, description: 'Xem phim mới trước cộng đồng', icon: '⏰' },
  { id: 'exclusive-badge', name: 'Huy hiệu đặc biệt', cost: 200, description: 'Nhận badge hiển thị khi chat', icon: '🏅' },
  { id: 'room-theme', name: 'Theme phòng xem chung', cost: 80, description: 'Tùy chỉnh giao diện phòng', icon: '🎨' },
]

export const TCOIN_PACKAGES = [
  { id: 'starter', name: 'Gói Khởi Đầu', tcoins: 100, priceVnd: 19000, bonus: 0 },
  { id: 'popular', name: 'Gói Phổ Biến', tcoins: 500, priceVnd: 79000, bonus: 50 },
  { id: 'premium', name: 'Gói Premium', tcoins: 1200, priceVnd: 169000, bonus: 200 },
  { id: 'vip', name: 'Gói VIP', tcoins: 3000, priceVnd: 399000, bonus: 600 },
]

// ═══════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════

export async function getWallet(userId: string): Promise<WalletResponse> {
  const wallet = await repo.getOrCreateWallet(userId)
  const { totalEarned, totalSpent } = await repo.getAggregates(wallet.id)

  return {
    balance: wallet.balance,
    userId: wallet.userId,
    createdAt: wallet.createdAt.toISOString(),
    totalEarned,
    totalSpent,
  }
}

// ═══════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════

export async function getTransactions(
  userId: string,
  page = 1,
  perPage = 20,
  category?: string,
): Promise<TransactionsResponse> {
  const wallet = await repo.findWallet(userId)
  if (!wallet) return { transactions: [], total: 0, page, perPage }

  const { transactions, total } = await repo.getTransactions(wallet.id, page, perPage, category)

  return {
    transactions: transactions.map(mapTransaction),
    total,
    page,
    perPage,
  }
}

// ═══════════════════════════════════════════════
// REWARDS
// ═══════════════════════════════════════════════

export async function claimDailyCheckin(userId: string): Promise<DailyCheckinResponse> {
  const wallet = await repo.getOrCreateWallet(userId)

  // Check if already checked in today
  const alreadyChecked = await repo.hasCheckedInToday(wallet.id)
  if (alreadyChecked) {
    // Calculate next checkin time (tomorrow 00:00)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return {
      ok: false,
      amount: 0,
      balance: wallet.balance,
      message: 'Bạn đã điểm danh hôm nay rồi!',
      nextCheckinAt: tomorrow.toISOString(),
    }
  }

  const config = REWARD_CONFIGS.find((r) => r.id === 'daily_checkin')!
  const { wallet: updated } = await repo.creditWallet(
    wallet.id,
    config.amount,
    'daily_checkin',
    `Điểm danh hàng ngày: +${config.amount} TCoin`,
  )

  return {
    ok: true,
    amount: config.amount,
    balance: updated.balance,
    message: `Nhận ${config.amount} TCoin! Quay lại ngày mai nhé.`,
  }
}

/**
 * Reward for completing a movie/episode watch.
 * Called by the watch system when progress >= 92%.
 */
export async function rewardWatchComplete(userId: string, movieId: string): Promise<{ ok: boolean; amount: number }> {
  const wallet = await repo.getOrCreateWallet(userId)
  const config = REWARD_CONFIGS.find((r) => r.id === 'watch_complete')!

  // Check daily limit
  const todayCount = await repo.countTodayRewards(wallet.id, 'watch_reward')
  if (config.maxPerDay && todayCount >= config.maxPerDay) {
    return { ok: false, amount: 0 }
  }

  await repo.creditWallet(
    wallet.id,
    config.amount,
    'watch_reward',
    `Xem phim hoàn tất: +${config.amount} TCoin`,
    movieId,
    'movie',
  )

  return { ok: true, amount: config.amount }
}

/**
 * Reward for writing a review.
 */
export async function rewardReview(userId: string, reviewId: string): Promise<{ ok: boolean; amount: number }> {
  const wallet = await repo.getOrCreateWallet(userId)
  const config = REWARD_CONFIGS.find((r) => r.id === 'write_review')!

  const todayCount = await repo.countTodayRewards(wallet.id, 'review_reward')
  if (config.maxPerDay && todayCount >= config.maxPerDay) {
    return { ok: false, amount: 0 }
  }

  await repo.creditWallet(
    wallet.id,
    config.amount,
    'review_reward',
    `Viết đánh giá phim: +${config.amount} TCoin`,
    reviewId,
    'review',
  )

  return { ok: true, amount: config.amount }
}

/**
 * Admin: manually adjust user's balance.
 */
export async function adminAdjust(
  targetUserId: string,
  amount: number,
  reason: string,
  adminUserId: string,
) {
  const wallet = await repo.getOrCreateWallet(targetUserId)

  if (amount > 0) {
    return repo.creditWallet(
      wallet.id,
      amount,
      'admin_adjustment',
      `Admin điều chỉnh: ${reason}`,
      adminUserId,
      'admin_user',
    )
  } else if (amount < 0) {
    return repo.debitWallet(
      wallet.id,
      Math.abs(amount),
      'admin_adjustment',
      `Admin điều chỉnh: ${reason}`,
      adminUserId,
      'admin_user',
    )
  }

  throw new Error('Amount cannot be zero')
}

// ═══════════════════════════════════════════════
// SPEND
// ═══════════════════════════════════════════════

export async function spendTcoins(userId: string, optionId: string): Promise<SpendResponse> {
  const option = SPEND_OPTIONS.find((o) => o.id === optionId)
  if (!option) {
    return { ok: false, amount: 0, balance: 0, message: 'Tùy chọn không hợp lệ' }
  }

  const wallet = await repo.getOrCreateWallet(userId)
  if (wallet.balance < option.cost) {
    return {
      ok: false,
      amount: 0,
      balance: wallet.balance,
      message: `Không đủ TCoin. Cần ${option.cost}, hiện có ${wallet.balance}.`,
    }
  }

  const { wallet: updated } = await repo.debitWallet(
    wallet.id,
    option.cost,
    'spend',
    `Đổi: ${option.name}`,
    optionId,
    'spend_option',
  )

  return {
    ok: true,
    amount: option.cost,
    balance: updated.balance,
    message: `Đã đổi "${option.name}" thành công!`,
  }
}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════

export async function getAdminWallets(page = 1, perPage = 20) {
  const { wallets, total } = await repo.getAllWallets(page, perPage)

  const items = await Promise.all(
    wallets.map(async (w) => {
      const { totalEarned, totalSpent } = await repo.getAggregates(w.id)
      const lastTxn = await repo.getTransactions(w.id, 1, 1)
      return {
        userId: w.userId,
        userName: w.user.name,
        email: w.user.email,
        balance: w.balance,
        totalEarned,
        totalSpent,
        transactionCount: w._count.transactions,
        lastActivity: lastTxn.transactions[0]?.createdAt.toISOString() ?? null,
      }
    }),
  )

  return { items, total, page, perPage }
}

export async function getAdminPaymentOrders(page = 1, perPage = 20, status?: string) {
  const { orders, total } = await repo.getAllPaymentOrders(page, perPage, status)

  const items = await Promise.all(
    orders.map(async (o) => {
      const user = await repo.getPaymentOrderUser(o.userId)
      return {
        id: o.id,
        userId: o.userId,
        userName: user?.name ?? 'Unknown',
        amount: o.amountVnd,
        currency: 'VND',
        tcoins: o.coinAmount + o.bonusAmount,
        provider: o.provider,
        providerTxnId: null,
        status: o.status,
        paidAt: o.paidAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      }
    }),
  )

  return { items, total, page, perPage }
}

// ═══════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════

function mapTransaction(t: any): TransactionItem {
  return {
    id: t.id,
    type: t.type,
    category: t.category,
    amount: t.amount,
    balanceBefore: t.balanceBefore,
    balanceAfter: t.balanceAfter,
    description: t.description,
    referenceId: t.referenceId,
    referenceType: t.referenceType,
    createdAt: t.createdAt.toISOString(),
  }
}
