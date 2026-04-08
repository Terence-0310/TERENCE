// ============================================
// Prisma Client Singleton — Canonical Entry Point
// ============================================
// ALL server modules MUST import Prisma from here.
// This ensures a single PrismaClient instance across the app.
//
// Usage:
//   import { prisma } from '@/src/server/shared/db/prisma'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
