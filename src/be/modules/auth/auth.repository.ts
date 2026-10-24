// ============================================
// Auth Module — Repository
// ============================================
// Prisma queries for auth-related data access.

import { prisma } from '@/src/be/shared/db/prisma'
import { Role } from '@prisma/client'
import { hashToken } from './reset-token'

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
      role: (data.role ?? 'USER') as Role,
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

// Verification tokens are stored as SHA-256 digests (like password-reset
// tokens); callers always pass the raw token from the email link.
export async function findVerificationToken(token: string) {
  return prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  })
}

export async function deleteVerificationToken(identifier: string, token: string) {
  return prisma.verificationToken.deleteMany({
    where: { identifier, token: hashToken(token) },
  })
}

export async function deleteVerificationTokensByIdentifier(identifier: string) {
  return prisma.verificationToken.deleteMany({
    where: { identifier },
  })
}

export async function createVerificationToken(identifier: string, token: string, expires: Date) {
  return prisma.verificationToken.create({
    data: { identifier, token: hashToken(token), expires },
  })
}

export async function verifyUserEmail(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      emailVerified: new Date(),
    },
  })
}
