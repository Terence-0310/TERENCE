// ============================================
// Users Module — Service
// ============================================

import { UsersRepository } from './users.repository'
import type { Prisma, Role } from '@prisma/client'
import { withCache } from '@/src/lib/redis'

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Get paginated users with optional filters and sorting
   * 
   * @param search - Search string for name or email
   * @param role - Filter by user role (e.g., 'ADMIN', 'USER')
   * @param status - Filter by user status (e.g., 'active', 'banned')
   * @param deleted - Filter by soft-delete status ('true', 'false', or 'all')
   * @param sortBy - Sort criteria ('newest', 'oldest', 'lastLogin', 'loginCount', 'name')
   * @param skip - Number of records to skip
   * @param limit - Number of records to return
   * @returns Array of users and the total count
   */
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
    if (role) where.role = role as Role
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

  /**
   * Retrieves global statistics about users with Redis caching
   * 
   * @returns Object containing user statistics
   */
  async getGlobalStats() {
    return withCache('global_user_stats', 300, async () => {
      return this.usersRepository.getGlobalStats()
    })
  }

  /**
   * Create a new user with unchecked input data
   * 
   * @param data - The user creation data
   * @returns The created user
   */
  async createUser(data: Prisma.UserUncheckedCreateInput) {
    return this.usersRepository.create(data)
  }

  /**
   * Find a user by their unique ID
   * 
   * @param id - The ID of the user
   * @returns The found user or null
   */
  async getUserById(id: string) {
    return this.usersRepository.findById(id)
  }

  /**
   * Find a user by their email address
   * 
   * @param email - The email of the user
   * @returns The found user or null
   */
  async getUserByEmail(email: string) {
    return this.usersRepository.findByEmail(email)
  }

  /**
   * Update an existing user
   * 
   * @param id - The ID of the user to update
   * @param data - The update payload
   * @returns The updated user
   */
  async updateUser(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return this.usersRepository.update(id, data)
  }

  /**
   * Soft delete a user (marks deletedAt) and removes their active sessions
   * 
   * @param id - The ID of the user to soft delete
   * @returns The updated user record
   */
  async softDeleteUser(id: string) {
    await this.usersRepository.deleteSessions(id)
    return this.usersRepository.softDelete(id)
  }

  /**
   * Permanently delete a user from the database
   * 
   * @param id - The ID of the user to hard delete
   * @returns The deleted user record
   */
  async deleteUser(id: string) {
    return this.usersRepository.delete(id)
  }
}
