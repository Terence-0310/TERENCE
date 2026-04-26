// ============================================
// Users Module — Service
// ============================================

import { UsersRepository } from './users.repository'
import type { Prisma } from '@prisma/client'

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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

    return this.usersRepository.findManyWithCount(where, orderBy, skip, limit)
  }

  async createUser(data: Prisma.UserUncheckedCreateInput) {
    return this.usersRepository.create(data)
  }

  async getUserById(id: string) {
    return this.usersRepository.findById(id)
  }

  async getUserByEmail(email: string) {
    return this.usersRepository.findByEmail(email)
  }

  async updateUser(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return this.usersRepository.update(id, data)
  }

  async softDeleteUser(id: string) {
    await this.usersRepository.deleteSessions(id)
    return this.usersRepository.softDelete(id)
  }

  async deleteUser(id: string) {
    return this.usersRepository.delete(id)
  }
}
