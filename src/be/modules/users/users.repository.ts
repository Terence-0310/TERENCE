// ============================================
// Users Module — Repository
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import type { Prisma } from '@prisma/client'

export const UsersRepository = {
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
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        avatar: true, isActive: true, createdAt: true,
      },
    })
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  },

  async create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data })
  },

  async update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data })
  },

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    })
  },

  async delete(id: string) {
    return prisma.user.delete({ where: { id } })
  },

  async deleteSessions(userId: string) {
    return prisma.session.deleteMany({ where: { userId } })
  }
}
