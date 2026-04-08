// ============================================
// Prisma Client Singleton — LEGACY ENTRY POINT
// ============================================
// ⚠️ DEPRECATED: Import from '@/src/server/shared/db/prisma' instead.
// This file re-exports for backward compatibility.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
