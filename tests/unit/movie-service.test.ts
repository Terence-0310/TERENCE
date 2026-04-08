// ============================================
// Unit Tests — Movie Service (business logic)
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixtures } from '@/tests/fixtures'

// Use vi.hoisted to define mocks that are referenced in vi.mock factories
const { mockMovieRepo, mockCache } = vi.hoisted(() => ({
  mockMovieRepo: {
    findMany: vi.fn(),
    findBySlugOrId: vi.fn(),
    findFeatured: vi.fn(),
    findTrending: vi.fn(),
    findLatest: vi.fn(),
    findByType: vi.fn(),
    findByGenre: vi.fn(),
    findByCountry: vi.fn(),
    search: vi.fn(),
    incrementView: vi.fn(),
    findRecentlyUpdated: vi.fn(),
  },
  mockCache: {
    getOrSet: vi.fn((_key: string, fetcher: () => unknown) => fetcher()),
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidateTag: vi.fn(),
    invalidateAll: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/movie.repository', () => ({
  movieRepository: mockMovieRepo,
}))

vi.mock('@/services/tmdb/movie-service', () => ({
  getTrending: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
  getPopular: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
  getTopRated: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
  getNowPlaying: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
  getUpcoming: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
  getGenres: vi.fn().mockResolvedValue([]),
  getMovieDetail: vi.fn(),
  getMoviesByGenre: vi.fn(),
  getMoviesByCountry: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cache: mockCache,
  CacheKeys: {
    moviesByType: (t: string, p: number) => `movies:type:${t}:${p}`,
    moviesByGenre: (g: string, p: number) => `movies:genre:${g}:${p}`,
    moviesByCountry: (c: string, p: number) => `movies:country:${c}:${p}`,
    movieDetail: (id: string) => `movie:detail:${id}`,
    searchSuggestions: (q: string) => `search:suggest:${q}`,
  },
  CacheTags: { HOME: 'homepage', MOVIE: 'movie' },
}))

import { movieService } from '@/lib/services/movie.service'

describe('movieService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.getOrSet.mockImplementation((_key: string, fetcher: () => unknown) => fetcher())
  })

  describe('getByType()', () => {
    it('should call repository with correct type', async () => {
      mockMovieRepo.findByType.mockResolvedValue({
        data: [fixtures.movie.basic],
        total: 1, page: 1, limit: 24,
      })
      const result = await movieService.getByType('movie', 1, 24)
      expect(mockMovieRepo.findByType).toHaveBeenCalledWith('movie', 1, 24)
      expect(result.data).toHaveLength(1)
    })
  })

  describe('getByGenre()', () => {
    it('should call repository with genre slug', async () => {
      mockMovieRepo.findByGenre.mockResolvedValue({ data: [], total: 0, page: 1, limit: 24 })
      await movieService.getByGenre('hanh-dong', 1, 24)
      expect(mockMovieRepo.findByGenre).toHaveBeenCalledWith('hanh-dong', 1, 24)
    })
  })

  describe('getByCountry()', () => {
    it('should call repository with country slug', async () => {
      mockMovieRepo.findByCountry.mockResolvedValue({ data: [], total: 0, page: 1, limit: 24 })
      await movieService.getByCountry('han-quoc', 2, 10)
      expect(mockMovieRepo.findByCountry).toHaveBeenCalledWith('han-quoc', 2, 10)
    })
  })

  describe('getDetail()', () => {
    it('should return movie for valid slug', async () => {
      mockMovieRepo.findBySlugOrId.mockResolvedValue(fixtures.movie.basic)
      const result = await movieService.getDetail('avengers-endgame')
      expect(result?.title).toBe('Avengers: Endgame')
    })

    it('should return null for non-existent slug', async () => {
      mockMovieRepo.findBySlugOrId.mockResolvedValue(null)
      const result = await movieService.getDetail('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('search()', () => {
    it('should forward to repository search', async () => {
      mockMovieRepo.search.mockResolvedValue({ data: [fixtures.movie.basic], total: 1, page: 1, limit: 24 })
      const result = await movieService.search('avengers', 1, 24)
      expect(mockMovieRepo.search).toHaveBeenCalledWith('avengers', 1, 24)
      expect(result.total).toBe(1)
    })
  })

  describe('searchSuggestions()', () => {
    it('should return empty for short query', async () => {
      const result = await movieService.searchSuggestions('a')
      expect(result).toEqual([])
    })

    it('should return mapped suggestions for valid query', async () => {
      mockMovieRepo.search.mockResolvedValue({ data: [fixtures.movie.basic], total: 1, page: 1, limit: 8 })
      const result = await movieService.searchSuggestions('avengers')
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('slug')
    })
  })

  describe('incrementView()', () => {
    it('should call repository and invalidate cache', async () => {
      mockMovieRepo.incrementView.mockResolvedValue({ id: 'movie-1', viewCount: 10001 })
      const result = await movieService.incrementView('movie-1')
      expect(mockMovieRepo.incrementView).toHaveBeenCalledWith('movie-1')
      expect(mockCache.invalidate).toHaveBeenCalled()
      expect(result.viewCount).toBe(10001)
    })
  })

  describe('getHomepageData()', () => {
    it('should return structured homepage data', async () => {
      mockMovieRepo.findFeatured.mockResolvedValue([])
      mockMovieRepo.findTrending.mockResolvedValue([])
      mockMovieRepo.findLatest.mockResolvedValue([])
      const result = await movieService.getHomepageData()
      expect(result).toHaveProperty('tmdb')
      expect(result).toHaveProperty('db')
      expect(result.db).toHaveProperty('featured')
    })
  })
})
