// ============================================
// Prisma Mock — shared mock factory for all tests
// ============================================
// Usage:
//   import { createMockPrisma } from '@/tests/helpers/mock-prisma'
//   vi.mock('@/src/be/shared/db/prisma', () => ({ prisma: createMockPrisma() }))

import { vi } from 'vitest'

export function createMockPrisma() {
  const mockCrud = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn().mockResolvedValue({}),
  })

  return {
    movie: mockCrud(),
    episode: mockCrud(),
    genre: mockCrud(),
    country: mockCrud(),
    person: mockCrud(),
    review: mockCrud(),
    user: mockCrud(),
    session: mockCrud(),
    adminLog: mockCrud(),
    watchHistory: mockCrud(),
    syncJob: mockCrud(),
    syncLog: mockCrud(),
    short: mockCrud(),
    newsPost: mockCrud(),
    wallet: mockCrud(),
    walletTransaction: mockCrud(),
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
