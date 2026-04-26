import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ok, unauthorized, notFound, serverError, badRequest } from '@/src/be/shared/api-handler'

export class UsersPublicController {
  // GET /api/user/profile
  static async getProfile(req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user || !(session.user as any).id) {
        return unauthorized()
      }

      const userId = (session.user as any).id

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          createdAt: true
        }
      })

      if (!user) return notFound('Tài khoản không tồn tại')

      const stats = {
        watchHistory: await prisma.watchHistory.count({ where: { userId } }),
        reviews: await prisma.review.count({ where: { userId } })
      }

      return ok({ user, stats })
    } catch (error) {
      console.error('[UsersPublicController] getProfile error:', error)
      return serverError()
    }
  }

  // PATCH /api/user/profile
  static async updateProfile(req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user || !(session.user as any).id) {
        return unauthorized()
      }
      const userId = (session.user as any).id

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

      return ok({ user: updated }, 'Cập nhật thành công')
    } catch (error) {
      console.error('[UsersPublicController] updateProfile error:', error)
      return serverError('Lỗi cập nhật thông tin')
    }
  }
}
