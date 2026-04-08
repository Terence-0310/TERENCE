// ============================================
// Auth Module — Repository
// ============================================
// Prisma queries for auth-related data access.
// TODO [MIGRATION] Consolidate all auth queries here from lib/auth/

import { prisma } from '@/src/server/shared/db/prisma'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUser(data: {
  email: string
  name: string
  passwordHash: string
  role?: string
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role ?? 'user',
    },
  })
}

export async function findSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })
}

export async function createSessionRecord(userId: string, expiresAt: Date) {
  return prisma.session.create({
    data: { userId, expiresAt },
  })
}

export async function deleteSessionRecord(sessionId: string) {
  return prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
}

export async function deleteExpiredSessions(userId: string) {
  return prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  })
}
