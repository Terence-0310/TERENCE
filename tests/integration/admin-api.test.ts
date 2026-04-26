// ============================================
// Integration Tests — Admin API Routes
// ============================================
// Tests: GET /api/admin/summary, GET /api/admin/notifications, GET /api/admin/search

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'
import { createMockPrisma, type MockPrisma } from '@/tests/helpers/mock-prisma'

// ── Mock dependencies ──
let mockPrisma: MockPrisma

const mockRequireAdmin = vi.fn()

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/modules/admin/api-helpers', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

vi.mock('@/src/be/modules/auth', () => ({
  AuthService: { getCurrentUser: vi.fn() },
}))

import { GET as summaryRoute } from '@/app/api/admin/summary/route'
import { GET as notificationsRoute } from '@/app/api/admin/notifications/route'
import { GET as searchRoute } from '@/app/api/admin/search/route'

describe('GET /api/admin/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    // Default: authenticated admin
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', email: 'admin@test.com', role: 'SUPER_ADMIN' } })
  })

  it('should return 401 when not authenticated', async () => {
    const { NextResponse } = await import('next/server')
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const req = createMockRequest('/api/admin/summary')
    const res = await summaryRoute()
    const { status } = await parseResponse(res)

    expect(status).toBe(401)
  })

  it('should return dashboard stats for authenticated admin', async () => {
    // Mock all the parallel queries
    mockPrisma.movie.count.mockResolvedValue(50)
    mockPrisma.user.count.mockResolvedValue(100)
    mockPrisma.episode.count.mockResolvedValue(200)
    mockPrisma.movie.findMany.mockResolvedValue([
      { id: '1', title: 'Test Movie', viewCount: 1000, status: 'published', posterUrl: '/poster.jpg' },
    ])
    mockPrisma.user.findMany.mockResolvedValue([
      { id: '1', name: 'User 1', email: 'user@test.com', role: 'USER', createdAt: new Date() },
    ])
    mockPrisma.adminLog.findMany.mockResolvedValue([])
    mockPrisma.movie.aggregate = vi.fn().mockResolvedValue({ _sum: { viewCount: 5000 } })
    mockPrisma.pageView.count.mockResolvedValue(300)

    const res = await summaryRoute()
    const { status, body } = await parseResponse<{
      success: boolean
      data: {
        stats: any[]
        recentMovies: any[]
        topUsers: any[]
        overview: any
      }
    }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.stats).toHaveLength(4)
    expect(body.data.recentMovies).toBeDefined()
    expect(body.data.topUsers).toBeDefined()
    expect(body.data.overview).toBeDefined()
    expect(body.data.overview.totalMovies).toBe(50)
  })

  it('should handle errors gracefully', async () => {
    mockPrisma.movie.count.mockRejectedValue(new Error('DB error'))

    const res = await summaryRoute()
    const { status } = await parseResponse(res)

    expect(status).toBe(500)
  })
})

describe('GET /api/admin/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'SUPER_ADMIN' } })
  })

  it('should return 401 when not authenticated', async () => {
    const { NextResponse } = await import('next/server')
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const res = await notificationsRoute()
    const { status } = await parseResponse(res)

    expect(status).toBe(401)
  })

  it('should return notifications from multiple sources', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'New User', email: 'new@test.com', createdAt: new Date() },
    ])
    mockPrisma.topupOrder.findMany.mockResolvedValue([])
    mockPrisma.adminLog.findMany.mockResolvedValue([])
    mockPrisma.episode.count.mockResolvedValue(0)
    mockPrisma.movie.findMany.mockResolvedValue([])

    const res = await notificationsRoute()
    const { status, body } = await parseResponse<{
      success: boolean
      data: any[]
      unreadCount: number
    }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.unreadCount).toBe('number')
  })

  it('should include broken episodes as warning notifications', async () => {
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.topupOrder.findMany.mockResolvedValue([])
    mockPrisma.adminLog.findMany.mockResolvedValue([])
    mockPrisma.episode.count.mockResolvedValue(5) // 5 broken episodes
    mockPrisma.movie.findMany.mockResolvedValue([])

    const res = await notificationsRoute()
    const { body } = await parseResponse<{ data: Array<{ type: string }> }>(res)

    const warningNotif = body.data.find(n => n.type === 'warning')
    expect(warningNotif).toBeDefined()
  })
})

describe('GET /api/admin/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'SUPER_ADMIN' } })
  })

  it('should return empty results for short query', async () => {
    const req = createMockRequest('/api/admin/search', { searchParams: { q: 'a' } })
    const res = await searchRoute(req)
    const { status, body } = await parseResponse<{ data: { movies: any[]; users: any[]; pages: any[] } }>(res)

    expect(status).toBe(200)
    expect(body.data.movies).toHaveLength(0)
    expect(body.data.users).toHaveLength(0)
    expect(body.data.pages).toHaveLength(0)
  })

  it('should search movies and users for valid query', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([
      { id: 'm1', title: 'Batman', slug: 'batman', contentType: 'movie', status: 'published', posterUrl: null, year: 2022 },
    ])
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Bruce', email: 'bruce@test.com', role: 'USER', status: 'active' },
    ])

    const req = createMockRequest('/api/admin/search', { searchParams: { q: 'bat' } })
    const res = await searchRoute(req)
    const { status, body } = await parseResponse<{ success: boolean; data: any }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.movies).toHaveLength(1)
    expect(body.data.movies[0].title).toBe('Batman')
    expect(body.data.users).toHaveLength(1)
  })

  it('should match dashboard pages by name', async () => {
    mockPrisma.movie.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])

    const req = createMockRequest('/api/admin/search', { searchParams: { q: 'Quản lý phim' } })
    const res = await searchRoute(req)
    const { body } = await parseResponse<{ data: { pages: Array<{ title: string; href: string }> } }>(res)

    expect(body.data.pages.length).toBeGreaterThan(0)
    expect(body.data.pages[0].href).toContain('/dashboard')
  })
})
