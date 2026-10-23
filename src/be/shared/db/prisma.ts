// ============================================
// Prisma Client Singleton — Canonical Entry Point
// ============================================
// ALL server modules MUST import Prisma from here.
// This ensures a single PrismaClient instance across the app.
//
// Usage:
//   import { prisma } from '@/src/be/shared/db/prisma'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Cache in every environment, not only dev: in production the custom server
// (dist/server.js) and the Next.js bundles each carry their own copy of this
// module in one process — without the global they'd open two engines + pools.
globalForPrisma.prisma = prisma
