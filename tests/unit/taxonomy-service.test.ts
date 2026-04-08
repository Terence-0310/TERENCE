// ============================================
// Unit Tests — Taxonomy Service
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixtures } from '@/tests/fixtures'

const { mockGenreRepo, mockCountryRepo, mockCache } = vi.hoisted(() => ({
  mockGenreRepo: {
    findAll: vi.fn(),
    findAllWithCount: vi.fn(),
    findBySlug: vi.fn(),
    findById: vi.fn(),
  },
  mockCountryRepo: {
    findAll: vi.fn(),
    findAllWithCount: vi.fn(),
    findBySlug: vi.fn(),
    findByCode: vi.fn(),
  },
  mockCache: {
    getOrSet: vi.fn((_key: string, fetcher: () => unknown) => fetcher()),
    invalidateTag: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/genre.repository', () => ({ genreRepository: mockGenreRepo }))
vi.mock('@/lib/repositories/country.repository', () => ({ countryRepository: mockCountryRepo }))
vi.mock('@/lib/cache', () => ({
  cache: mockCache,
  CacheKeys: {
    genres: () => 'taxonomy:genres',
    countries: () => 'taxonomy:countries',
    genresWithCount: () => 'taxonomy:genres:with_count',
    countriesWithCount: () => 'taxonomy:countries:with_count',
  },
  CacheTags: { TAXONOMY: 'taxonomy' },
}))

import { taxonomyService } from '@/lib/services/taxonomy.service'

describe('taxonomyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.getOrSet.mockImplementation((_key: string, fetcher: () => unknown) => fetcher())
  })

  describe('getGenres()', () => {
    it('should return all active genres', async () => {
      mockGenreRepo.findAll.mockResolvedValue([fixtures.genre.action, fixtures.genre.comedy])
      const result = await taxonomyService.getGenres()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Hành Động')
    })
  })

  describe('getGenresWithCount()', () => {
    it('should return genres with movie count', async () => {
      mockGenreRepo.findAllWithCount.mockResolvedValue([
        { ...fixtures.genre.action, movieCount: 42 },
      ])
      const result = await taxonomyService.getGenresWithCount()
      expect(result[0].movieCount).toBe(42)
    })
  })

  describe('getGenreBySlug()', () => {
    it('should return genre for valid slug', async () => {
      mockGenreRepo.findBySlug.mockResolvedValue(fixtures.genre.action)
      const result = await taxonomyService.getGenreBySlug('hanh-dong')
      expect(result?.name).toBe('Hành Động')
    })

    it('should return null for non-existent slug', async () => {
      mockGenreRepo.findBySlug.mockResolvedValue(null)
      expect(await taxonomyService.getGenreBySlug('xxx')).toBeNull()
    })
  })

  describe('getCountries()', () => {
    it('should return all active countries', async () => {
      mockCountryRepo.findAll.mockResolvedValue([fixtures.country.us, fixtures.country.kr])
      const result = await taxonomyService.getCountries()
      expect(result).toHaveLength(2)
    })
  })

  describe('getCountriesWithCount()', () => {
    it('should return countries with movie count', async () => {
      mockCountryRepo.findAllWithCount.mockResolvedValue([{ ...fixtures.country.us, movieCount: 100 }])
      const result = await taxonomyService.getCountriesWithCount()
      expect(result[0].movieCount).toBe(100)
    })
  })

  describe('getCountryByCode()', () => {
    it('should find country by ISO code', async () => {
      mockCountryRepo.findByCode.mockResolvedValue(fixtures.country.vn)
      const result = await taxonomyService.getCountryByCode('VN')
      expect(result?.name).toBe('Việt Nam')
    })
  })

  describe('invalidateAll()', () => {
    it('should call invalidateTag', () => {
      taxonomyService.invalidateAll()
      expect(mockCache.invalidateTag).toHaveBeenCalledWith('taxonomy')
    })
  })
})
