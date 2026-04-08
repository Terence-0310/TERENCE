// ============================================
// Taxonomy Service — Genres + Countries
// ============================================
// Cached taxonomy data for menu dropdowns and page lists.

import { genreRepository } from '@/lib/repositories/genre.repository'
import { countryRepository } from '@/lib/repositories/country.repository'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'

const TTL = {
  TAXONOMY: 3600, // 1 hour — taxonomy rarely changes
} as const

export const taxonomyService = {
  // ── Genres ──

  async getGenres() {
    return cache.getOrSet(
      CacheKeys.genres(),
      () => genreRepository.findAll(),
      { ttl: TTL.TAXONOMY, tags: [CacheTags.TAXONOMY] },
    )
  },

  async getGenresWithCount() {
    return cache.getOrSet(
      CacheKeys.genresWithCount(),
      () => genreRepository.findAllWithCount(),
      { ttl: TTL.TAXONOMY, tags: [CacheTags.TAXONOMY] },
    )
  },

  async getGenreBySlug(slug: string) {
    return genreRepository.findBySlug(slug)
  },

  // ── Countries ──

  async getCountries() {
    return cache.getOrSet(
      CacheKeys.countries(),
      () => countryRepository.findAll(),
      { ttl: TTL.TAXONOMY, tags: [CacheTags.TAXONOMY] },
    )
  },

  async getCountriesWithCount() {
    return cache.getOrSet(
      CacheKeys.countriesWithCount(),
      () => countryRepository.findAllWithCount(),
      { ttl: TTL.TAXONOMY, tags: [CacheTags.TAXONOMY] },
    )
  },

  async getCountryBySlug(slug: string) {
    return countryRepository.findBySlug(slug)
  },

  async getCountryByCode(code: string) {
    return countryRepository.findByCode(code)
  },

  // ── Invalidation ──

  invalidateAll() {
    cache.invalidateTag(CacheTags.TAXONOMY)
  },
}
