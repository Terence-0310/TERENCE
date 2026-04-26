import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'

const { mockGetMovieBySlug } = vi.hoisted(() => ({
  mockGetMovieBySlug: vi.fn(),
}))

vi.mock('@/src/be/modules/movies/movie-service', () => ({
  getMovieBySlug: mockGetMovieBySlug,
}))

import { GET as movieSlugRoute } from '@/app/api/v1/movies/[slug]/route'

describe('GET /api/v1/movies/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetMovieBySlug.mockResolvedValue({
      id: '1',
      slug: 'avengers',
      title: 'Avengers',
      originalTitle: 'The Avengers',
      posterUrl: '/poster.jpg',
      year: 2012,
      quality: 'FHD',
      language: 'Vietsub',
      episodeCurrent: 'Full',
      categories: [{ genre: { name: 'Action', slug: 'action' } }],
      countries: [{ country: { name: 'USA', code: 'us' } }],
      episodes: []
    })
  })

  it('should return 400 when slug is missing or empty', async () => {
    const req = createMockRequest('/api/v1/movies/')
    const res = await movieSlugRoute(req, { params: Promise.resolve({ slug: '   ' }) })

    const { status, body } = await parseResponse<{ success: boolean; error: string }>(res)
    expect(status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Missing slug parameter')
  })

  it('should return 404 when movie is not found', async () => {
    mockGetMovieBySlug.mockResolvedValue(null)

    const req = createMockRequest('/api/v1/movies/unknown')
    const res = await movieSlugRoute(req, { params: Promise.resolve({ slug: 'unknown' }) })

    const { status, body } = await parseResponse<{ success: boolean; error: string }>(res)
    expect(status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Không tìm thấy phim')
  })

  it('should return 200 and serialize the movie successfully', async () => {
    const req = createMockRequest('/api/v1/movies/avengers')
    const res = await movieSlugRoute(req, { params: Promise.resolve({ slug: 'avengers' }) })

    const { status, body } = await parseResponse<{ success: boolean; data: any }>(res)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe('avengers')
    expect(body.data.title).toBe('Avengers')
  })

  it('should return 500 when service throws an exception', async () => {
    mockGetMovieBySlug.mockRejectedValue(new Error('DB connection failed'))

    const req = createMockRequest('/api/v1/movies/avengers')
    const res = await movieSlugRoute(req, { params: Promise.resolve({ slug: 'avengers' }) })

    const { status, body } = await parseResponse<{ success: boolean; error: string }>(res)
    expect(status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Lỗi máy chủ nội bộ')
  })
})
