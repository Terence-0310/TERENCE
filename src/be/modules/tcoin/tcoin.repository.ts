// ============================================
// TCoin Module — Repository (DB layer)
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import { encryptMetadata, decryptMetadata } from '@/src/be/shared/utils/encryption'
import { notifyUser, RT_EVENTS } from '@/src/be/shared/realtime/notify'

// Emit per-user wallet updates. Best-effort — silently no-ops when the
// Socket.IO server isn't running (Jest, plain `next dev`, etc.) so we
// don't break the wallet code path. Called *after* the prisma
// transaction commits to avoid emitting before persistence.
function emitWalletUpdate(userId: string, balance: number, transaction: any) {
  if (!userId) return
  notifyUser(userId, RT_EVENTS.TCOIN_UPDATED, { userId, balance })
  notifyUser(userId, RT_EVENTS.TCOIN_TX_NEW, {
    userId,
    balance,
    transaction: {
      id: transaction.id,
      type: transaction.type,
      direction: transaction.direction,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      referenceId: transaction.referenceId,
      createdAt: transaction.createdAt instanceof Date
        ? transaction.createdAt.toISOString()
        : transaction.createdAt,
    },
  })
}

// ─── Wallet ─────────────────────────────────────────────────

export async function findWallet(userId: string) {
  return prisma.wallet.findUnique({ where: { userId } })
}

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  })
}

/**
 * Atomic credit: increment balance + create transaction with balanceBefore/After.
 * Uses interactive transaction for atomicity.
 */
export async function creditWallet(
  walletId: string,
  amount: number,
  category: string,
  description: string,
  referenceId?: string,
  referenceType?: string,
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } },
    })

    const balanceAfter = updated.balance
    const balanceBefore = balanceAfter - amount

    const txn = await tx.walletTransaction.create({
      data: {
        userId: updated.userId,
        walletId,
        direction: 'credit',
        type: category, // Map old category logic to new type concept
        status: 'completed',
        amount,
        balanceBefore,
        balanceAfter,
        referenceId: referenceId ?? null,
        metadata: encryptMetadata({ description, referenceType: referenceType ?? null })
      },
    })

    return { wallet: updated, transaction: txn }
  }).then((result) => {
    emitWalletUpdate(result.wallet.userId, result.wallet.balance, result.transaction)
    // Persistent "you earned TCoin" notification (bell) — fire-and-forget so
    // the credit path stays fast. Best-effort: never block/throw.
    import('@/src/be/modules/notifications/notifications.service')
      .then(({ createNotification }) => createNotification({
        userId: result.wallet.userId,
        type: 'tcoin',
        title: `Bạn nhận được +${amount.toLocaleString('vi-VN')} TCoin`,
        message: description || null,
        link: '/tcoin',
      }))
      .catch(() => { /* best-effort */ })
    return result
  })
}

/**
 * Atomic debit: decrement balance + create transaction with balanceBefore/After.
 * Throws if insufficient balance.
 */
export async function debitWallet(
  walletId: string,
  amount: number,
  category: string,
  description: string,
  referenceId?: string,
  referenceType?: string,
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: walletId },
      data: { balance: { decrement: amount } },
    })

    if (updated.balance < 0) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    const balanceAfter = updated.balance
    const balanceBefore = balanceAfter + amount

    const txn = await tx.walletTransaction.create({
      data: {
        userId: updated.userId,
        walletId,
        direction: 'debit',
        type: category,
        status: 'completed',
        amount,
        balanceBefore,
        balanceAfter,
        referenceId: referenceId ?? null,
        metadata: encryptMetadata({ description, referenceType: referenceType ?? null })
      },
    })

    return { wallet: updated, transaction: txn }
  }).then((result) => {
    emitWalletUpdate(result.wallet.userId, result.wallet.balance, result.transaction)
    return result
  })
}

/**
 * Atomic refund: credit back a debit transaction and mark it as REFUND.
 */
export async function refundWalletTransaction(transactionId: string, reason: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const originalTx = await tx.walletTransaction.findUnique({ where: { id: transactionId } })
    if (!originalTx) throw new Error('TRANSACTION_NOT_FOUND')
    
    // Accept both 'debit' and 'DEBIT' (case-insensitive check)
    if (originalTx.direction.toLowerCase() !== 'debit') {
      throw new Error('ONLY_DEBIT_CAN_BE_REFUNDED')
    }

    // Check if already refunded
    const existingRefund = await tx.walletTransaction.findFirst({
      where: {
        referenceId: originalTx.id,
        type: 'REFUND'
      }
    })
    if (existingRefund) throw new Error('ALREADY_REFUNDED')

    // Credit back the wallet
    const updatedWallet = await tx.wallet.update({
      where: { id: originalTx.walletId },
      data: { balance: { increment: originalTx.amount } }
    })

    const balanceAfter = updatedWallet.balance
    const balanceBefore = balanceAfter - originalTx.amount

    // Create REFUND transaction
    const refundTx = await tx.walletTransaction.create({
      data: {
        userId: originalTx.userId,
        walletId: originalTx.walletId,
        direction: 'credit',
        type: 'REFUND',
        status: 'SUCCESS',
        amount: originalTx.amount,
        balanceBefore,
        balanceAfter,
        referenceId: originalTx.id,
        title: 'Hoàn tiền',
        description: `Hoàn tiền giao dịch ${originalTx.id}`,
        metadata: encryptMetadata({ reason, refundedBy: adminId, originalType: originalTx.type })
      }
    })

    return { refundTx, balanceAfter, userId: originalTx.userId }
  }).then(({ refundTx, balanceAfter, userId }) => {
    emitWalletUpdate(userId, balanceAfter, refundTx)
    return refundTx
  })
}

// ─── Transactions ────────────────────────────────────────────

export async function getTransactions(
  walletId: string,
  page: number,
  perPage: number,
  type?: string,
) {
  const where: any = { walletId }
  if (type) where.type = type

  const skip = (page - 1) * perPage
  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.walletTransaction.count({ where }),
  ])
  return { 
    transactions: transactions.map(tx => ({ ...tx, metadata: decryptMetadata(tx.metadata) })), 
    total 
  }
}

export async function getAggregates(walletId: string) {
  const [earned, spent] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { walletId, direction: 'credit' },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { walletId, direction: 'debit' },
      _sum: { amount: true },
    }),
  ])
  return {
    totalEarned: earned._sum.amount ?? 0,
    totalSpent: spent._sum.amount ?? 0,
  }
}

/**
 * Check if user already checked in today (based on category + date).
 */
export async function hasCheckedInToday(walletId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const count = await prisma.walletTransaction.count({
    where: {
      walletId,
      type: 'daily_checkin',
      createdAt: { gte: today, lt: tomorrow },
    },
  })
  return count > 0
}

/**
 * Count rewards of a category earned today.
 */
export async function countTodayRewards(walletId: string, type: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.walletTransaction.count({
    where: {
      walletId,
      type,
      createdAt: { gte: today, lt: tomorrow },
    },
  })
}

// ─── Payment Orders ──────────────────────────────────────────

export async function findPaymentOrder(id: string) {
  return prisma.topupOrder.findUnique({ where: { id } })
}

// ─── Admin Queries ───────────────────────────────────────────

export async function getAllWallets(page: number, perPage: number, search?: string) {
  const skip = (page - 1) * perPage
  // Search applies to the joined user's name/email. When search is empty
  // we leave `where` undefined so Prisma uses the most efficient plan.
  const where = search && search.trim()
    ? {
        user: {
          OR: [
            { name:  { contains: search.trim(), mode: 'insensitive' as const } },
            { email: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        },
      }
    : undefined

  const [wallets, total] = await Promise.all([
    prisma.wallet.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.wallet.count({ where }),
  ])
  return { wallets, total }
}

/**
 * Site-wide TCoin stats. Single source of truth for the admin dashboard's
 * stat cards (previously summed only the current page, which gave wildly
 * wrong numbers as the user paged through wallets).
 */
export async function getGlobalStats() {
  const [
    totalCirculating,
    activeWallets,
    totalOrders,
    paidOrders,
  ] = await Promise.all([
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.wallet.count(),
    prisma.topupOrder.count(),
    prisma.topupOrder.count({ where: { status: 'PAID' } }),
  ])
  return {
    totalCirculating: totalCirculating._sum.balance ?? 0,
    activeWallets,
    totalOrders,
    completedOrders: paidOrders,
  }
}

export async function getAllPaymentOrders(page: number, perPage: number, status?: string) {
  const where: any = {}
  if (status) where.status = status

  const skip = (page - 1) * perPage
  const [orders, total] = await Promise.all([
    prisma.topupOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.topupOrder.count({ where }),
  ])
  return { orders, total }
}

export async function getPaymentOrderUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
}
