import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'

const mockRequireAdmin = vi.fn()

// Need to safely mock api-helpers while preserving other functions like paginatedResponse
vi.mock('@/src/be/modules/admin/api-helpers', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
  }
})

const { mockGetPaginatedMovies, mockCreateMovie, mockGetMovieBySlug } = vi.hoisted(() => ({
  mockGetPaginatedMovies: vi.fn(),
  mockCreateMovie: vi.fn(),
  mockGetMovieBySlug: vi.fn()
}))

vi.mock('@/src/be/modules/movies/movie-service', () => ({
  AdminMovieService: {
    getPaginatedMovies: mockGetPaginatedMovies,
    createMovie: mockCreateMovie,
    getMovieBySlug: mockGetMovieBySlug
  }
}))

vi.mock('@/src/be/modules/admin/audit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1')
}))

import { GET as adminMoviesGET, POST as adminMoviesPOST } from '@/app/api/admin/movies/route'
import { NextResponse } from 'next/server'

describe('Admin CRUD - API Movies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default authenticated admin
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', email: 'admin@test.com', role: 'SUPER_ADMIN' } })
    
    mockGetPaginatedMovies.mockResolvedValue([
      [{ id: 'm1', title: 'Admin Movie', slug: 'admin-movie' }],
      1
    ])
  })

  // GET /api/admin/movies
  describe('GET /api/admin/movies', () => {
    it('should return 401 when not authenticated', async () => {
      mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      
      const req = createMockRequest('/api/admin/movies')
      const res = await adminMoviesGET(req)
      const { status } = await parseResponse(res)
      
      expect(status).toBe(401)
    })

    it('should return paginated movies for valid search params', async () => {
      const req = createMockRequest('/api/admin/movies', {
        searchParams: { page: '1', limit: '10', search: 'admin', deleted: 'true' }
      })
      const res = await adminMoviesGET(req)
      const { status, body } = await parseResponse<{ data: any[], pagination: { total: number } }>(res)
      
      expect(status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
      
      expect(mockGetPaginatedMovies).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: { not: null },
          OR: expect.any(Array)
        }),
        0, // skip
        10, // limit
        { createdAt: 'desc' } // default order
      )
    })
  })

  // POST /api/admin/movies
  describe('POST /api/admin/movies', () => {
    it('should return 401 when not authenticated', async () => {
      mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      
      const req = createMockRequest('/api/admin/movies', { body: {} })
      const res = await adminMoviesPOST(req)
      const { status } = await parseResponse(res)
      
      expect(status).toBe(401)
    })

    it('should return 400 when body validation fails', async () => {
      // Invalid body missing required fields
      const req = createMockRequest('/api/admin/movies', { 
        body: { title: '' }, // title too short
        method: 'POST'
      })
      const res = await adminMoviesPOST(req)
      const { status, body } = await parseResponse<{ error: string }>(res)
      
      expect(status).toBe(400)
      expect(body.error).toContain('Tên phim là bắt buộc') // from Zod schema
    })

    it('should return 409 if movie slug already exists', async () => {
      mockGetMovieBySlug.mockResolvedValue({ id: 'existing' })
      
      const req = createMockRequest('/api/admin/movies', { 
        body: { 
          title: 'Existing Movie', 
          slug: 'existing-movie',
          contentType: 'movie',
          status: 'published'
        },
        method: 'POST'
      })
      const res = await adminMoviesPOST(req)
      const { status, body } = await parseResponse<{ error: string }>(res)
      
      expect(status).toBe(409)
      expect(body.error).toBe('Slug đã tồn tại')
    })

    it('should return 201 and create movie successfully', async () => {
      mockGetMovieBySlug.mockResolvedValue(null)
      mockCreateMovie.mockResolvedValue({ id: 'new1', title: 'New Movie' })
      
      const req = createMockRequest('/api/admin/movies', { 
        body: { 
          title: 'New Movie',
          slug: 'new-movie',
          contentType: 'movie',
          status: 'draft',
          originalTitle: 'New Movie Original'
        },
        method: 'POST'
      })
      const res = await adminMoviesPOST(req)
      const { status, body } = await parseResponse<any>(res)
      
      expect(status).toBe(201)
      expect(body.id).toBe('new1')
      expect(mockCreateMovie).toHaveBeenCalled()
    })
  })
})
