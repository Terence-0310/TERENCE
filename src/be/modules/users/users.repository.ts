// ============================================
// Users Module — Repository
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import { getUserLoader } from '@/src/be/shared/db/loaders'
import type { Prisma } from '@prisma/client'

export class UsersRepository {
  async findManyWithCount(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
    skip: number,
    take: number
  ) {
    return Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true, name: true, email: true, role: true, status: true,
          isActive: true, avatar: true, lastLoginAt: true, lastLoginIp: true,
          loginCount: true, blockedReason: true, createdAt: true, updatedAt: true,
          deletedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])
  }

  async getGlobalStats() {
    return Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active', deletedAt: null } }),
      prisma.user.count({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, deletedAt: null } }),
      prisma.user.count({ where: { status: 'banned', deletedAt: null } })
    ])
  }

  async findById(id: string) {
    // Sử dụng DataLoader để gộp các truy vấn trùng lặp trong cùng 1 request
    const user = await getUserLoader().load(id)
    if (!user) return null

    return {
      id: user.id, email: user.email, name: user.name, role: user.role, status: user.status,
      avatar: user.avatar, isActive: user.isActive, createdAt: user.createdAt,
    }
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  async create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data })
  }

  async update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data })
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    })
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } })
  }

  async deleteSessions(userId: string) {
    return prisma.session.deleteMany({ where: { userId } })
  }
}
