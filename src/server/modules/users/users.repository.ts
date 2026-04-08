// ============================================
// Users Module — Repository
// ============================================

import { prisma } from '@/src/server/shared/db/prisma'

export async function findAll(params: { page?: number; perPage?: number; search?: string }) {
  const { page = 1, perPage = 20, search } = params
  const skip = (page - 1) * perPage

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true, email: true, name: true, role: true,
        avatar: true, isActive: true, createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, perPage }
}

export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true,
      avatar: true, isActive: true, createdAt: true,
    },
  })
}

export async function update(id: string, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id }, data })
}
