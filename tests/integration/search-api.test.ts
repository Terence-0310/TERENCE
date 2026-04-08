// ============================================
// Integration Tests — API Route Handler Tests
// ============================================
// Tests actual route handler functions with mocked dependencies.
// NOT full HTTP tests — we call the handler directly with a mock NextRequest.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'

// ── Mock search module ──
const { mockSearchMovies } = vi.hoisted(() => ({
  mockSearchMovies: vi.fn(),
}))

vi.mock('@/src/server/search/movie-search-service', () => ({
  searchMovies: mockSearchMovies,
}))

// ── Mock rate limiter (always allow in tests) ──
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({
    check: () => ({ allowed: true, remaining: 10, resetMs: Date.now() + 60000 }),
  }),
  getClientIdentifier: () => 'test-ip',
}))

import { GET as searchRoute } from '@/app/api/v1/search/route'

describe('GET /api/v1/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when q param is missing', async () => {
    const req = createMockRequest('/api/v1/search')
    const res = await searchRoute(req)
    const { status, body } = await parseResponse<{ success: boolean; error: string }>(res)

    expect(status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('q')
  })

  it('should return 400 for empty q param', async () => {
    const req = createMockRequest('/api/v1/search', { searchParams: { q: '' } })
    const res = await searchRoute(req)
    const { status } = await parseResponse(res)
    expect(status).toBe(400)
  })

  it('should return search results for valid query', async () => {
    mockSearchMovies.mockResolvedValue({
      items: [{ id: '1', title: 'Avengers', slug: 'avengers' }],
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
      source: 'prisma',
    })

    const req = createMockRequest('/api/v1/search', { searchParams: { q: 'avengers' } })
    const res = await searchRoute(req)
    const { status, body } = await parseResponse<{
      success: boolean
      data: unknown[]
      pagination: { total: number }
    }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('should forward filter params to service', async () => {
    mockSearchMovies.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 20,
      total: 0,
      totalPages: 0,
      source: 'prisma',
    })

    const req = createMockRequest('/api/v1/search', {
      searchParams: { q: 'test', type: 'movie', page: '2', perPage: '10' },
    })
    await searchRoute(req)

    expect(mockSearchMovies).toHaveBeenCalledWith(
      'test', 2, 10,
      expect.objectContaining({ contentType: 'movie' }),
    )
  })

  it('should ignore invalid type param', async () => {
    mockSearchMovies.mockResolvedValue({
      items: [], page: 1, perPage: 20, total: 0, totalPages: 0, source: 'prisma',
    })

    const req = createMockRequest('/api/v1/search', {
      searchParams: { q: 'test', type: 'podcast' },
    })
    await searchRoute(req)

    expect(mockSearchMovies).toHaveBeenCalledWith(
      'test', 1, 20,
      expect.objectContaining({ contentType: undefined }),
    )
  })

  it('should return 500 when service throws', async () => {
    mockSearchMovies.mockRejectedValue(new Error('DB down'))

    const req = createMockRequest('/api/v1/search', { searchParams: { q: 'test' } })
    const res = await searchRoute(req)
    const { status } = await parseResponse(res)
    expect(status).toBe(500)
  })
})
