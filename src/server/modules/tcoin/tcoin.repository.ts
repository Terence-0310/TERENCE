// ============================================
// TCoin Module — Repository (DB layer)
// ============================================

import { prisma } from '@/src/server/shared/db/prisma'

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
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } })
    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore + amount

    const updated = await tx.wallet.update({
      where: { id: walletId },
      data: { balance: balanceAfter },
    })

    const txn = await tx.walletTransaction.create({
      data: {
        walletId,
        type: 'credit',
        category,
        amount,
        balanceBefore,
        balanceAfter,
        description,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
      },
    })

    return { wallet: updated, transaction: txn }
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
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } })
    if (wallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE')
    }
    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore - amount

    const updated = await tx.wallet.update({
      where: { id: walletId },
      data: { balance: balanceAfter },
    })

    const txn = await tx.walletTransaction.create({
      data: {
        walletId,
        type: 'debit',
        category,
        amount,
        balanceBefore,
        balanceAfter,
        description,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
      },
    })

    return { wallet: updated, transaction: txn }
  })
}

// ─── Transactions ────────────────────────────────────────────

export async function getTransactions(
  walletId: string,
  page: number,
  perPage: number,
  category?: string,
) {
  const where: any = { walletId }
  if (category) where.category = category

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
  return { transactions, total }
}

export async function getAggregates(walletId: string) {
  const [earned, spent] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { walletId, type: 'credit' },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { walletId, type: 'debit' },
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
      category: 'daily_checkin',
      createdAt: { gte: today, lt: tomorrow },
    },
  })
  return count > 0
}

/**
 * Count rewards of a category earned today.
 */
export async function countTodayRewards(walletId: string, category: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.walletTransaction.count({
    where: {
      walletId,
      category,
      createdAt: { gte: today, lt: tomorrow },
    },
  })
}

// ─── Payment Orders ──────────────────────────────────────────

export async function createPaymentOrder(data: {
  userId: string
  amount: number
  currency: string
  tcoins: number
  provider: string
  metadata?: string
}) {
  return prisma.paymentOrder.create({ data })
}

export async function findPaymentOrder(id: string) {
  return prisma.paymentOrder.findUnique({ where: { id } })
}

export async function updatePaymentOrder(
  id: string,
  data: {
    status: string
    providerTxnId?: string
    paidAt?: Date
  },
) {
  return prisma.paymentOrder.update({ where: { id }, data })
}

// ─── Admin Queries ───────────────────────────────────────────

export async function getAllWallets(page: number, perPage: number) {
  const skip = (page - 1) * perPage
  const [wallets, total] = await Promise.all([
    prisma.wallet.findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.wallet.count(),
  ])
  return { wallets, total }
}

export async function getAllPaymentOrders(page: number, perPage: number, status?: string) {
  const where: any = {}
  if (status) where.status = status

  const skip = (page - 1) * perPage
  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.paymentOrder.count({ where }),
  ])
  return { orders, total }
}

export async function getPaymentOrderUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
}
