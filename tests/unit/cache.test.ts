// ============================================
// Unit Tests — Cache Layer
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'

describe('lib/cache', () => {
  beforeEach(() => {
    cache.invalidateAll()
  })

  describe('set() & get()', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for non-existent key', () => {
      expect(cache.get('missing')).toBeUndefined()
    })

    it('should return undefined for expired entry', () => {
      // TTL of -1 means expiresAt is in the past
      cache.set('expiring', 'data', { ttl: -1 })
      expect(cache.get('expiring')).toBeUndefined()
    })

    it('should store objects and arrays', () => {
      const obj = { name: 'test', count: 42 }
      cache.set('obj', obj)
      expect(cache.get('obj')).toEqual(obj)

      const arr = [1, 2, 3]
      cache.set('arr', arr)
      expect(cache.get('arr')).toEqual(arr)
    })
  })

  describe('getOrSet()', () => {
    it('should call fetcher on cache miss', async () => {
      const fetcher = vi.fn().mockReturnValue('computed')
      const result = await cache.getOrSet('key', fetcher)
      expect(result).toBe('computed')
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('should NOT call fetcher on cache hit', async () => {
      cache.set('key', 'cached')
      const fetcher = vi.fn()
      const result = await cache.getOrSet('key', fetcher)
      expect(result).toBe('cached')
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('should handle async fetchers', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: [1, 2, 3] })
      const result = await cache.getOrSet('async', fetcher)
      expect(result).toEqual({ data: [1, 2, 3] })
    })
  })

  describe('invalidate()', () => {
    it('should remove a specific key', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.invalidate('a')
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
    })
  })

  describe('invalidateTag()', () => {
    it('should remove all entries with a tag', () => {
      cache.set('m1', 'movie1', { tags: ['movie'] })
      cache.set('m2', 'movie2', { tags: ['movie'] })
      cache.set('g1', 'genre1', { tags: ['taxonomy'] })

      cache.invalidateTag('movie')

      expect(cache.get('m1')).toBeUndefined()
      expect(cache.get('m2')).toBeUndefined()
      expect(cache.get('g1')).toBe('genre1')
    })

    it('should handle entries with multiple tags', () => {
      cache.set('multi', 'data', { tags: ['movie', 'homepage'] })
      cache.invalidateTag('homepage')
      expect(cache.get('multi')).toBeUndefined()
    })
  })

  describe('invalidateAll()', () => {
    it('should clear everything', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.invalidateAll()
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBeUndefined()
    })
  })

  describe('stats()', () => {
    it('should report correct size', () => {
      cache.set('x', 1, { ttl: 3600 })
      cache.set('y', 2, { ttl: 3600 })
      const s = cache.stats()
      expect(s.size).toBe(2)
      expect(s.keys).toContain('x')
      expect(s.keys).toContain('y')
    })
  })

  describe('CacheKeys', () => {
    it('should generate correct key patterns', () => {
      expect(CacheKeys.homeTrending()).toBe('home:trending:1')
      expect(CacheKeys.homeTrending(3)).toBe('home:trending:3')
      expect(CacheKeys.genres()).toBe('taxonomy:genres')
      expect(CacheKeys.movieDetail('abc')).toBe('movie:detail:abc')
      expect(CacheKeys.moviesByGenre('action', 2)).toBe('movies:genre:action:2')
      expect(CacheKeys.moviesByCountry('US')).toBe('movies:country:US:1')
      expect(CacheKeys.searchSuggestions(' Hello ')).toBe('search:suggest:hello')
      expect(CacheKeys.reviews(5)).toBe('reviews:list:5')
      expect(CacheKeys.schedule('2026-01-01')).toBe('schedule:2026-01-01')
    })
  })

  describe('CacheTags', () => {
    it('should have expected tag constants', () => {
      expect(CacheTags.HOME).toBe('homepage')
      expect(CacheTags.MOVIE).toBe('movie')
      expect(CacheTags.TAXONOMY).toBe('taxonomy')
      expect(CacheTags.REVIEW).toBe('review')
      expect(CacheTags.SCHEDULE).toBe('schedule')
      expect(CacheTags.PERSON).toBe('person')
    })
  })
})
