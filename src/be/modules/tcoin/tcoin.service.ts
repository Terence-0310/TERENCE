// ============================================
// TCoin Module — Service (business logic)
// ============================================
// All TCoin operations: wallet, rewards, spending, admin.
// This is the ONLY layer API routes should call.

import { prisma } from '@/src/be/shared/db/prisma'
import * as repo from './tcoin.repository'
import { notifyUser, RT_EVENTS } from '@/src/be/shared/realtime/notify'
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
    description: 'Điểm danh mỗi ngày để nhận TCoin trên trang ví',
    icon: '',
    maxPerDay: 1,
  },
  {
    id: 'watch_complete',
    category: 'watch_reward',
    amount: 2,
    label: 'Xem phim hoàn tất',
    description: 'Tự động cộng khi xem xong 1 tập (≥ 92% thời lượng)',
    icon: '',
    maxPerDay: 10,
  },
  {
    id: 'write_review',
    category: 'review_reward',
    amount: 10,
    label: 'Viết đánh giá phim',
    description: 'Cộng tự động khi bạn gửi review được duyệt',
    icon: '',
    maxPerDay: 3,
  },
  {
    id: 'referral',
    category: 'referral_reward',
    amount: 100,
    label: 'Mời bạn bè đăng ký',
    description: 'Nhận thưởng khi người bạn mời đăng ký thành công',
    icon: '',
  },
  {
    id: 'verify_email',
    category: 'other',
    amount: 20,
    label: 'Xác minh email',
    description: 'Xác minh địa chỉ email để khoá tài khoản an toàn hơn',
    icon: '',
    oneTime: true,
    actionUrl: '/profile',
  },
  {
    id: 'complete_profile',
    category: 'other',
    amount: 30,
    label: 'Hoàn thiện hồ sơ',
    description: 'Cập nhật ảnh đại diện và phần giới thiệu bản thân',
    icon: '',
    oneTime: true,
    actionUrl: '/profile',
  },
]

export const SPEND_OPTIONS: SpendOption[] = [
  { id: 'remove-ads-7d', name: 'Xóa quảng cáo 7 ngày', cost: 50, description: 'Trải nghiệm không quảng cáo', icon: '', durationDays: 7 },
  { id: 'hd-upgrade', name: 'Nâng HD → Full HD', cost: 30, description: 'Xem phim chất lượng cao hơn', icon: '', durationDays: 30 },
  { id: 'early-access', name: 'Xem sớm 24h', cost: 100, description: 'Xem phim mới trước cộng đồng', icon: '' },
  { id: 'exclusive-badge', name: 'Huy hiệu đặc biệt', cost: 200, description: 'Nhận badge hiển thị khi chat', icon: '' },
  { id: 'room-theme', name: 'Theme phòng xem chung', cost: 80, description: 'Tùy chỉnh giao diện phòng', icon: '' },
  { id: 'avatar-frame', name: 'Khung viền avatar Neon', cost: 150, description: 'Hiệu ứng viền sáng quanh ảnh đại diện', icon: '', durationDays: 30 },
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

  notifyUser(userId, RT_EVENTS.TASK_CLAIMED, {
    taskId: 'daily_checkin',
    amount: config.amount,
    balance: updated.balance,
  })

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
 * Reward one-time khi user xác minh email thành công.
 * Idempotent: nếu đã từng credit thì trả ok:false.
 */
export async function rewardVerifyEmail(userId: string): Promise<{ ok: boolean; amount: number }> {
  const wallet = await repo.getOrCreateWallet(userId)
  const config = REWARD_CONFIGS.find((r) => r.id === 'verify_email')!

  const existing = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id, type: 'verify_email' },
    select: { id: true },
  })
  if (existing) return { ok: false, amount: 0 }

  await repo.creditWallet(
    wallet.id,
    config.amount,
    'verify_email',
    `Xác minh email: +${config.amount} TCoin`,
    userId,
    'user',
  )
  return { ok: true, amount: config.amount }
}

/**
 * Reward one-time khi user hoàn thiện hồ sơ (avatar + bio đều có giá trị).
 * Idempotent: chỉ credit lần đầu khi hồ sơ đạt tiêu chí.
 */
export async function rewardCompleteProfile(userId: string): Promise<{ ok: boolean; amount: number }> {
  const wallet = await repo.getOrCreateWallet(userId)
  const config = REWARD_CONFIGS.find((r) => r.id === 'complete_profile')!

  const existing = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id, type: 'complete_profile' },
    select: { id: true },
  })
  if (existing) return { ok: false, amount: 0 }

  await repo.creditWallet(
    wallet.id,
    config.amount,
    'complete_profile',
    `Hoàn thiện hồ sơ: +${config.amount} TCoin`,
    userId,
    'user',
  )
  return { ok: true, amount: config.amount }
}

/**
 * One-time reward when a user signs up via someone's referral link. The
 * INVITER gets the credit; the invitee can earn their own rewards via
 * the normal task list. We guard against double-credits with a
 * (type, referenceId) lookup — re-running the signup hook is a no-op.
 *
 *   inviterUserId — owner of the referral code (the one earning TCoin).
 *   inviteeUserId — the newly-registered user (used as referenceId).
 */
export async function rewardInvite(inviterUserId: string, inviteeUserId: string): Promise<{ ok: boolean; amount: number }> {
  if (inviterUserId === inviteeUserId) return { ok: false, amount: 0 }

  const wallet = await repo.getOrCreateWallet(inviterUserId)
  const config = REWARD_CONFIGS.find((r) => r.id === 'referral')!

  const existing = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id, type: 'referral_reward', referenceId: inviteeUserId },
    select: { id: true },
  })
  if (existing) return { ok: false, amount: 0 }

  await repo.creditWallet(
    wallet.id,
    config.amount,
    'referral_reward',
    `Mời bạn bè đăng ký: +${config.amount} TCoin`,
    inviteeUserId,
    'user',
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

/**
 * Admin: manually refund a specific debit transaction.
 */
export async function adminRefund(
  transactionId: string,
  reason: string,
  adminUserId: string,
) {
  try {
    const refundTx = await repo.refundWalletTransaction(transactionId, reason, adminUserId)
    return { ok: true, transaction: refundTx }
  } catch (error: any) {
    if (error.message === 'TRANSACTION_NOT_FOUND') return { ok: false, message: 'Giao dịch không tồn tại' }
    if (error.message === 'ONLY_DEBIT_CAN_BE_REFUNDED') return { ok: false, message: 'Chỉ có thể hoàn tiền các giao dịch trừ tiền (DEBIT)' }
    if (error.message === 'ALREADY_REFUNDED') return { ok: false, message: 'Giao dịch này đã được hoàn tiền trước đó' }
    return { ok: false, message: error.message || 'Lỗi hoàn tiền nội bộ' }
  }
}

// ═══════════════════════════════════════════════
// SPEND
// ═══════════════════════════════════════════════

// Sentinel "never expires" date for permanent perks stored in DateTime columns.
const PERK_PERMANENT = new Date('9999-12-31T00:00:00.000Z')

/**
 * Keep the denormalised perk columns on User in sync after a successful spend.
 * Only perks that need to be shown on OTHER users (and therefore can't rely on
 * the viewer's own getActivePerks) are mirrored here.
 */
async function applyPerkDenormalisation(userId: string, optionId: string, durationDays?: number) {
  const expiry = durationDays
    ? new Date(Date.now() + durationDays * 86_400_000)
    : PERK_PERMANENT
  try {
    if (optionId === 'avatar-frame') {
      await prisma.user.update({ where: { id: userId }, data: { avatarFrameUntil: expiry } })
    } else if (optionId === 'exclusive-badge') {
      await prisma.user.update({ where: { id: userId }, data: { exclusiveBadgeUntil: expiry } })
    }
  } catch {
    /* best-effort — the authoritative record is still the wallet transaction */
  }
}

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

  try {
    const { wallet: updated } = await repo.debitWallet(
      wallet.id,
      option.cost,
      'spend',
      `Đổi: ${option.name}`,
      optionId,
      'spend_option',
    )

    // Denormalise perks that must be visible on OTHER users (avatar frame in
    // comments/chat, badge in chat) so list queries don't recompute them.
    await applyPerkDenormalisation(userId, optionId, option.durationDays)

    notifyUser(userId, RT_EVENTS.REWARD_REDEEMED, {
      optionId,
      name: option.name,
      cost: option.cost,
      balance: updated.balance,
    })

    return {
      ok: true,
      amount: option.cost,
      balance: updated.balance,
      message: `Đã đổi "${option.name}" thành công!`,
    }
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      // Tái nạp wallet để lấy số dư mới nhất (do giao dịch bị từ chối)
      const latestWallet = await repo.getOrCreateWallet(userId)
      return {
        ok: false,
        amount: 0,
        balance: latestWallet.balance,
        message: `Số dư bị trừ song song: Không đủ TCoin. Cần ${option.cost}, hiện có ${latestWallet.balance}.`,
      }
    }
    throw error
  }
}

// ═══════════════════════════════════════════════
// ACTIVE PERKS — quy ra từ các giao dịch DEBIT "spend"
// ═══════════════════════════════════════════════

export type ActivePerk = {
  optionId: string
  name: string
  purchasedAt: string
  activeUntil: string | null  // null = vĩnh viễn
  durationDays?: number
}

export type ActivePerks = {
  avatarFrame: ActivePerk | null
  removeAds: ActivePerk | null
  hdUpgrade: ActivePerk | null
  earlyAccess: ActivePerk | null
  exclusiveBadge: ActivePerk | null
  roomTheme: ActivePerk | null
}

/**
 * Trả về danh sách perk còn hiệu lực của user, suy ra từ wallet_transactions
 * (DEBIT mới nhất theo từng optionId; áp dụng durationDays nếu có).
 */
export async function getActivePerks(userId: string): Promise<ActivePerks> {
  const wallet = await repo.findWallet(userId)
  if (!wallet) {
    return {
      avatarFrame: null,
      removeAds: null,
      hdUpgrade: null,
      earlyAccess: null,
      exclusiveBadge: null,
      roomTheme: null,
    }
  }

  const optionIds = SPEND_OPTIONS.map((o) => o.id)
  // Direction/type được lưu lẫn cả lowercase ('debit') và uppercase ('DEBIT'),
  // dùng `in` để khớp đôi bên.
  const txs = await prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      direction: { in: ['debit', 'DEBIT'] },
      type: { in: ['spend', 'SPEND'] },
      referenceId: { in: optionIds },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Lấy giao dịch gần nhất cho từng optionId
  const latestByOption: Record<string, typeof txs[number]> = {}
  for (const tx of txs) {
    if (!tx.referenceId) continue
    if (!latestByOption[tx.referenceId]) {
      latestByOption[tx.referenceId] = tx
    }
  }

  const now = new Date()

  const buildPerk = (optionId: string): ActivePerk | null => {
    const tx = latestByOption[optionId]
    if (!tx) return null
    const opt = SPEND_OPTIONS.find((o) => o.id === optionId)
    if (!opt) return null

    let activeUntil: Date | null = null
    if (opt.durationDays) {
      activeUntil = new Date(tx.createdAt)
      activeUntil.setDate(activeUntil.getDate() + opt.durationDays)
      if (activeUntil < now) return null // hết hạn
    }
    return {
      optionId,
      name: opt.name,
      purchasedAt: tx.createdAt.toISOString(),
      activeUntil: activeUntil ? activeUntil.toISOString() : null,
      durationDays: opt.durationDays,
    }
  }

  return {
    avatarFrame: buildPerk('avatar-frame'),
    removeAds: buildPerk('remove-ads-7d'),
    hdUpgrade: buildPerk('hd-upgrade'),
    earlyAccess: buildPerk('early-access'),
    exclusiveBadge: buildPerk('exclusive-badge'),
    roomTheme: buildPerk('room-theme'),
  }
}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════

export async function getAdminGlobalStats() {
  return repo.getGlobalStats()
}

export async function getAdminWallets(page = 1, perPage = 20, search?: string) {
  const { wallets, total } = await repo.getAllWallets(page, perPage, search)

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

/**
 * Tính toán TCoin nhận được dựa trên số lượng gốc,
 * tự động áp dụng các tỉ lệ thưởng (VD: nạp nhiều thưởng thêm 5-20%).
 * Hỗ trợ hệ số nhân sự kiện.
 * 
 * @param baseAmount Số lượng TCoin cơ bản
 * @param eventMultiplier Hệ số nhân của sự kiện (mặc định 1.0)
 * @returns { base, bonusPercentage, bonus, total }
 */
export function calculateTCoinBonus(baseAmount: number, eventMultiplier = 1.0) {
  let bonusPercentage = 0
  
  // Nạp càng nhiều, phần trăm bonus càng lớn
  if (baseAmount >= 3000) bonusPercentage = 0.20 // 20%
  else if (baseAmount >= 1200) bonusPercentage = 0.15 // 15%
  else if (baseAmount >= 500) bonusPercentage = 0.10 // 10%
  else if (baseAmount >= 100) bonusPercentage = 0.05 // 5%

  const baseWithEvent = Math.floor(baseAmount * eventMultiplier)
  const bonus = Math.floor(baseWithEvent * bonusPercentage)
  const total = baseWithEvent + bonus

  return {
    base: baseWithEvent,
    bonusPercentage: Math.round(bonusPercentage * 100),
    bonus,
    total
  }
}
