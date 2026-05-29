// ============================================
// TCoin Module — Controller
// ============================================

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as TcoinService from '@/src/be/modules/tcoin/tcoin.service'
import { createBankQrOrder, expireStaleOrders } from '@/src/be/services/topup-order.service'
import { prisma } from '@/src/be/shared/db/prisma'
import { ok, unauthorized, notFound, serverError, badRequest, parseAndValidate } from '@/src/be/shared/api-handler'
import { z } from 'zod'

function startOfTodayLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const spendSchema = z.object({
  optionId: z.string().min(1, 'optionId is required')
})

const createOrderSchema = z.object({
  packageId: z.string().min(1, 'packageId is required')
})

export class TcoinController {
  
  static async getUserId() {
    const session = await getServerSession(authOptions)
    return session?.user?.id ?? null
  }

  // GET /api/tcoin/wallet
  static async getWallet() {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()
    const wallet = await TcoinService.getWallet(userId)
    return ok(wallet)
  }

  // GET /api/tcoin/overview — public-friendly: packages/rewards/spend cho cả guest,
  // nhưng balance / lịch sử / order chỉ trả về khi đã đăng nhập.
  static async getOverview() {
    const userId = await this.getUserId()

    const packages = await prisma.tCoinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (!userId) {
      return ok({
        isAuthenticated: false,
        balance: 0,
        packages,
        rewards: TcoinService.REWARD_CONFIGS,
        spendOptions: TcoinService.SPEND_OPTIONS,
        recentTransactions: [],
        activeOrder: null,
        dailyCheckinAvailable: false,
        rewardStatus: {},
      })
    }

    const todayStart = startOfTodayLocal()

    const [
      wallet,
      recentTransactions,
      activeOrder,
      dailyToday,
      watchToday,
      reviewToday,
      referralCount,
      verifiedEmail,
      completedProfile,
    ] = await Promise.all([
      TcoinService.getWallet(userId),
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.topupOrder.findFirst({
        where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.walletTransaction.count({
        where: { userId, type: 'daily_checkin', createdAt: { gte: todayStart } },
      }),
      prisma.walletTransaction.count({
        where: { userId, type: 'watch_reward', createdAt: { gte: todayStart } },
      }),
      prisma.walletTransaction.count({
        where: { userId, type: 'review_reward', createdAt: { gte: todayStart } },
      }),
      prisma.walletTransaction.count({
        where: { userId, type: 'referral_reward' },
      }),
      prisma.walletTransaction.findFirst({
        where: { userId, type: 'verify_email' },
        select: { id: true },
      }),
      prisma.walletTransaction.findFirst({
        where: { userId, type: 'complete_profile' },
        select: { id: true },
      }),
    ])

    const rewardStatus = {
      daily_checkin: { claimedToday: dailyToday > 0 },
      watch_complete: { todayCount: watchToday },
      write_review: { todayCount: reviewToday },
      referral: { totalCount: referralCount },
      verify_email: { claimed: !!verifiedEmail },
      complete_profile: { claimed: !!completedProfile },
    }

    return ok({
      isAuthenticated: true,
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      packages,
      rewards: TcoinService.REWARD_CONFIGS,
      spendOptions: TcoinService.SPEND_OPTIONS,
      recentTransactions,
      activeOrder,
      dailyCheckinAvailable: dailyToday === 0,
      rewardStatus,
    })
  }

  // GET /api/tcoin/transactions
  static async getTransactions(req: NextRequest) {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()
    
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    return ok(await TcoinService.getTransactions(userId, page))
  }

  // POST /api/tcoin/spend
  static async spend(req: NextRequest) {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()
    
    const validation = await parseAndValidate(req, spendSchema)
    if (validation.error) return validation.error

    const result = await TcoinService.spendTcoins(userId, validation.data.optionId)
    if (!result.ok) return badRequest(result.message || 'Lỗi giao dịch')
    return ok(result)
  }

  // POST /api/tcoin/reward/daily-checkin
  static async dailyCheckin() {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()
    const result = await TcoinService.claimDailyCheckin(userId)
    return ok(result)
  }

  // POST /api/tcoin/topup/create-bank-order
  static async createBankOrder(req: NextRequest) {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()
    
    await expireStaleOrders().catch(() => {})
    
    const validation = await parseAndValidate(req, createOrderSchema)
    if (validation.error) return validation.error

    try {
      const orderData = await createBankQrOrder(userId, validation.data.packageId)
      return ok(orderData)
    } catch (e: any) {
      const { logger } = await import('@/src/be/shared/utils/logger')
      logger.error({ err: e }, 'Error creating bank order')
      return serverError(e.message || 'Internal Server Error')
    }
  }

  // GET /api/tcoin/order/[id]
  static async checkOrderStatus(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()

    const { id: code } = await params
    let order = await prisma.topupOrder.findUnique({ where: { code } })
    if (!order) {
      order = await prisma.topupOrder.findUnique({ where: { id: code } })
    }

    if (!order || order.userId !== userId) {
      return notFound('Order not found')
    }

    return ok({ status: order.status })
  }

  // DELETE /api/tcoin/order/[id] — user-initiated cancel for a PENDING order.
  // Refuses if the order is already PAID so we never lose a real payment.
  static async cancelOrder(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await this.getUserId()
    if (!userId) return unauthorized()

    const { id: code } = await params
    let order = await prisma.topupOrder.findUnique({ where: { code } })
    if (!order) {
      order = await prisma.topupOrder.findUnique({ where: { id: code } })
    }

    if (!order || order.userId !== userId) {
      return notFound('Order not found')
    }

    if (order.status === 'PAID') {
      return badRequest('Đơn đã thanh toán, không thể huỷ')
    }
    if (order.status !== 'PENDING') {
      // Already EXPIRED / FAILED / CANCELED — idempotent OK.
      return ok({ status: order.status })
    }

    const updated = await prisma.topupOrder.update({
      where: { id: order.id },
      data: { status: 'CANCELED' },
    })
    return ok({ status: updated.status })
  }
}
