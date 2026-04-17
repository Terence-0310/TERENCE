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
    aggregate: vi.fn().mockResolvedValue({ _sum: {}, _avg: {}, _min: {}, _max: {}, _count: {} }),
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
    topupOrder: mockCrud(),
    verificationToken: mockCrud(),
    passwordResetToken: mockCrud(),
    pageView: mockCrud(),
    watchPartyRoom: mockCrud(),
    watchPartyParticipant: mockCrud(),
    rolePermission: mockCrud(),
    userPermission: mockCrud(),
    bankWebhookLog: mockCrud(),
    favorite: mockCrud(),
    $transaction: vi.fn((arg: unknown) => {
      // Support both callback and array forms
      if (typeof arg === 'function') return (arg as (tx: unknown) => unknown)({})
      if (Array.isArray(arg)) return Promise.all(arg)
      return Promise.resolve()
    }),
    $queryRaw: vi.fn().mockResolvedValue([]),
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
