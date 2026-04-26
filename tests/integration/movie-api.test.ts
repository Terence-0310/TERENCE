import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'

// Mock the core movie service
const { mockGetMovieList } = vi.hoisted(() => ({
  mockGetMovieList: vi.fn(),
}))

vi.mock('@/src/be/modules/movies/movie-service', () => ({
  getMovieList: mockGetMovieList
}))

// Import the route handler
import { GET as moviesRoute } from '@/app/api/v1/movies/route'

describe('GET /api/v1/movies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock response representing a successful DB query
    mockGetMovieList.mockResolvedValue({
      movies: [
        {
          id: '1',
          slug: 'avengers',
          title: 'Avengers',
          originalTitle: 'The Avengers',
          posterUrl: '/poster.jpg',
          year: 2012,
          quality: 'FHD',
          language: 'Vietsub',
          episodeCurrent: 'Full',
        }
      ],
      total: 1,
      page: 1,
      perPage: 24
    })
  })

  it('should return 200 with default pagination when no params are provided', async () => {
    const req = createMockRequest('/api/v1/movies')
    const res = await moviesRoute(req)
    const { status, body } = await parseResponse<{
      success: boolean
      data: any[]
      pagination: any
    }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.pagination.page).toBe(1)
    
    // Check if service was called with default values
    expect(mockGetMovieList).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      perPage: 24,
      sort: 'newest'
    }))
  })

  it('should pass pagination and filter parameters to the service', async () => {
    const req = createMockRequest('/api/v1/movies', {
      searchParams: {
        page: '2',
        perPage: '10',
        category: 'hanh-dong',
        country: 'us',
        year: '2024',
        type: 'movie',
        sort: 'popular'
      }
    })
    
    await moviesRoute(req)
    
    expect(mockGetMovieList).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      perPage: 10,
      category: 'hanh-dong',
      country: 'us',
      year: 2024,
      contentType: 'movie',
      sort: 'popular'
    }))
  })

  it('should fallback to defaults when invalid parameters are given', async () => {
    const req = createMockRequest('/api/v1/movies', {
      searchParams: {
        page: '-5', // invalid, should fallback/clamp to 1
        perPage: '1000', // invalid, max is 100
        type: 'unknown_type', // unknown, should ignore
        sort: 'invalid_sort' // invalid, should fallback to newest
      }
    })
    
    await moviesRoute(req)
    
    expect(mockGetMovieList).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      perPage: 100, // Clamped to max allowed
      contentType: undefined,
      sort: 'newest'
    }))
  })

  it('should return 500 when service throws an exception', async () => {
    mockGetMovieList.mockRejectedValue(new Error('DB connection failed'))
    
    const req = createMockRequest('/api/v1/movies')
    const res = await moviesRoute(req)
    
    const { status, body } = await parseResponse<{ success: boolean, error: string }>(res)
    
    expect(status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Lỗi máy chủ nội bộ')
  })
})
