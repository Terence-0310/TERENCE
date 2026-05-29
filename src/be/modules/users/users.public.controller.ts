import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ok, unauthorized, notFound, serverError, badRequest } from '@/src/be/shared/api-handler'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'users-public-controller' })

export class UsersPublicController {
  // GET /api/user/profile
  static async getProfile(_req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id
      if (!userId) {
        return unauthorized()
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          image: true,
          bio: true,
          role: true,
          createdAt: true,
          isEmailVerified: true,
        }
      })

      // Google OAuth users have their picture stored in `image` (set by the
      // Prisma adapter) while `avatar` — the field this app lets users edit —
      // stays null until they upload one. Fall back to the OAuth picture so
      // the profile page shows the same avatar as the header instead of the
      // initial-letter placeholder.
      const user = dbUser && {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatar ?? dbUser.image,
        bio: dbUser.bio,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        isEmailVerified: dbUser.isEmailVerified,
      }

      // Has the verify_email TCoin reward already been credited?
      const verifyEmailClaimed = !!(await prisma.walletTransaction.findFirst({
        where: { userId, type: 'verify_email' },
        select: { id: true },
      }))

      if (!user) return notFound('Tài khoản không tồn tại')

      const stats = {
        watchHistory: await prisma.watchHistory.count({ where: { userId } }),
        reviews: await prisma.review.count({ where: { userId } })
      }

      // Active perks (avatar frame, hd upgrade, ...) derived from spend history
      let activePerks: any = null
      try {
        const { getActivePerks } = await import('@/src/be/modules/tcoin/tcoin.service')
        activePerks = await getActivePerks(userId)
      } catch (err) {
        log.error({ err: err instanceof Error ? err.message : err }, 'getProfile activePerks lookup failed')
      }

      return ok({ user, stats, activePerks, verifyEmailClaimed })
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'getProfile error')
      return serverError()
    }
  }

  // PATCH /api/user/profile
  static async updateProfile(req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id
      if (!userId) {
        return unauthorized()
      }

      const body = await req.json()
      const { name, bio, avatar } = body

      if (!name?.trim()) {
        return badRequest('Tên hiển thị không được để trống')
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { name, bio, avatar },
        select: { id: true, name: true, email: true, role: true, avatar: true, bio: true }
      })

      // Reward TCoin lần đầu hoàn thiện hồ sơ (avatar + bio cùng có giá trị)
      let rewardGranted: { amount: number } | null = null
      if (updated.avatar && updated.bio && updated.bio.trim().length >= 10) {
        try {
          const { rewardCompleteProfile } = await import('@/src/be/modules/tcoin/tcoin.service')
          const result = await rewardCompleteProfile(userId)
          if (result.ok) rewardGranted = { amount: result.amount }
        } catch (err) {
          log.error({ err: err instanceof Error ? err.message : err }, 'updateProfile reward TCoin failed')
        }
      }

      return ok(
        { user: updated, rewardGranted },
        rewardGranted ? `+${rewardGranted.amount} TCoin — hồ sơ đã hoàn thiện!` : 'Cập nhật thành công'
      )
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'updateProfile error')
      return serverError('Lỗi cập nhật thông tin')
    }
  }
}
