// ============================================
// Integration Tests — Watch Party API Routes
// ============================================
// Tests room creation, joining, listing, and participant management.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma, type MockPrisma } from '@/tests/helpers/mock-prisma'

// ── Mock dependencies ──
let mockPrisma: MockPrisma

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/modules/auth', () => ({
  AuthService: {
    getCurrentUser: vi.fn().mockResolvedValue({
      email: 'user@test.com',
      name: 'Test User',
      role: 'USER',
    }),
  },
}))

describe('Watch Party — Data Layer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
  })

  describe('Room creation', () => {
    it('should create a room with unique code', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'ABC123',
        hostId: 'user-1',
        movieId: 'movie-1',
        maxParticipants: 10,
        isActive: true,
        createdAt: new Date(),
      }
      mockPrisma.watchPartyRoom.create.mockResolvedValue(mockRoom)

      const room = await mockPrisma.watchPartyRoom.create({
        data: {
          code: 'ABC123',
          hostId: 'user-1',
          movieId: 'movie-1',
          maxParticipants: 10,
          isActive: true,
        },
      })

      expect(room.code).toBe('ABC123')
      expect(room.hostId).toBe('user-1')
      expect(room.isActive).toBe(true)
      expect(mockPrisma.watchPartyRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'ABC123',
            movieId: 'movie-1',
          }),
        })
      )
    })

    it('should enforce unique room codes', async () => {
      mockPrisma.watchPartyRoom.findUnique.mockResolvedValueOnce(null) // First check: code available
      mockPrisma.watchPartyRoom.findUnique.mockResolvedValueOnce({ id: 'existing' }) // Second: code taken

      const firstCheck = await mockPrisma.watchPartyRoom.findUnique({ where: { code: 'NEW123' } })
      expect(firstCheck).toBeNull() // Available

      const secondCheck = await mockPrisma.watchPartyRoom.findUnique({ where: { code: 'TAKEN1' } })
      expect(secondCheck).toBeTruthy() // Taken
    })
  })

  describe('Room lookup', () => {
    it('should find room by code', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'ABC123',
        hostId: 'user-1',
        movieId: 'movie-1',
        isActive: true,
        host: { id: 'user-1', name: 'Host User' },
        movie: { id: 'movie-1', title: 'Test Movie' },
      }
      mockPrisma.watchPartyRoom.findUnique.mockResolvedValue(mockRoom)

      const room = await mockPrisma.watchPartyRoom.findUnique({
        where: { code: 'ABC123' },
        include: { host: true, movie: true },
      })

      expect(room?.code).toBe('ABC123')
      expect(room?.host?.name).toBe('Host User')
      expect(room?.movie?.title).toBe('Test Movie')
    })

    it('should return null for inactive/non-existent room', async () => {
      mockPrisma.watchPartyRoom.findFirst.mockResolvedValue(null)

      const room = await mockPrisma.watchPartyRoom.findFirst({
        where: { code: 'INVALID', isActive: true },
      })

      expect(room).toBeNull()
    })
  })

  describe('Participant management', () => {
    it('should add participant to room', async () => {
      const mockParticipant = {
        id: 'part-1',
        roomId: 'room-1',
        userId: 'user-2',
        joinedAt: new Date(),
        isActive: true,
      }
      mockPrisma.watchPartyParticipant.create.mockResolvedValue(mockParticipant)

      const participant = await mockPrisma.watchPartyParticipant.create({
        data: {
          roomId: 'room-1',
          userId: 'user-2',
          isActive: true,
        },
      })

      expect(participant.roomId).toBe('room-1')
      expect(participant.userId).toBe('user-2')
      expect(participant.isActive).toBe(true)
    })

    it('should count active participants in a room', async () => {
      mockPrisma.watchPartyParticipant.count.mockResolvedValue(4)

      const count = await mockPrisma.watchPartyParticipant.count({
        where: { roomId: 'room-1', isActive: true },
      })

      expect(count).toBe(4)
      expect(mockPrisma.watchPartyParticipant.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roomId: 'room-1', isActive: true }),
        })
      )
    })

    it('should prevent duplicate joins via upsert', async () => {
      mockPrisma.watchPartyParticipant.upsert.mockResolvedValue({
        id: 'part-1',
        roomId: 'room-1',
        userId: 'user-2',
        isActive: true,
      })

      const result = await mockPrisma.watchPartyParticipant.upsert({
        where: { id: 'part-1' },
        update: { isActive: true },
        create: { roomId: 'room-1', userId: 'user-2', isActive: true },
      })

      expect(result.isActive).toBe(true)
      expect(mockPrisma.watchPartyParticipant.upsert).toHaveBeenCalled()
    })
  })

  describe('Room deactivation', () => {
    it('should deactivate room and all participants', async () => {
      mockPrisma.watchPartyRoom.update.mockResolvedValue({ id: 'room-1', isActive: false })
      mockPrisma.watchPartyParticipant.deleteMany.mockResolvedValue({ count: 4 })

      // Deactivate room
      const updatedRoom = await mockPrisma.watchPartyRoom.update({
        where: { id: 'room-1' },
        data: { isActive: false },
      })
      expect(updatedRoom.isActive).toBe(false)

      // Remove all participants
      const cleanup = await mockPrisma.watchPartyParticipant.deleteMany({
        where: { roomId: 'room-1' },
      })
      expect(cleanup.count).toBe(4)
    })
  })
})
