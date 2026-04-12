// ============================================
// Users Module — Service
// ============================================

import { UsersRepository } from './users.repository'
import type { Prisma } from '@prisma/client'

export const UsersService = {
  async getPaginatedUsers(
    search: string,
    role: string,
    status: string,
    deleted: string | null,
    sortBy: string,
    skip: number,
    limit: number
  ) {
    const where: Prisma.UserWhereInput = {}

    // Soft delete filter
    if (deleted === 'true') {
      where.deletedAt = { not: null }
    } else if (deleted !== 'all') {
      where.deletedAt = null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (role) where.role = role as any
    if (status) where.status = status

    // Sort
    const orderByMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      lastLogin: { lastLoginAt: 'desc' },
      loginCount: { loginCount: 'desc' },
      name: { name: 'asc' },
    }
    const orderBy = orderByMap[sortBy] || orderByMap.newest

    return UsersRepository.findManyWithCount(where, orderBy, skip, limit)
  },

  async createUser(data: Prisma.UserUncheckedCreateInput) {
    return UsersRepository.create(data)
  },

  async getUserById(id: string) {
    return UsersRepository.findById(id)
  },

  async getUserByEmail(email: string) {
    return UsersRepository.findByEmail(email)
  },

  async updateUser(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return UsersRepository.update(id, data)
  },

  async softDeleteUser(id: string) {
    await UsersRepository.deleteSessions(id)
    return UsersRepository.softDelete(id)
  },

  async deleteUser(id: string) {
    return UsersRepository.delete(id)
  }
}
