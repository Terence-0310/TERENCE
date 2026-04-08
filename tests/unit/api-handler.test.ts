// ============================================
// Unit Tests — API Handler Helpers
// ============================================

import { describe, it, expect } from 'vitest'
import {
  parsePagination,
  parseSort,
  parseFilters,
  getErrorMessage,
} from '@/lib/api/handler'
import { ZodError, z } from 'zod'

describe('lib/api/handler', () => {
  describe('parsePagination()', () => {
    it('should return defaults when no params', () => {
      const params = new URLSearchParams()
      const result = parsePagination(params)
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 })
    })

    it('should parse page and limit', () => {
      const params = new URLSearchParams({ page: '3', limit: '50' })
      const result = parsePagination(params)
      expect(result).toEqual({ page: 3, limit: 50, skip: 100 })
    })

    it('should clamp page to minimum 1', () => {
      const params = new URLSearchParams({ page: '-5' })
      const result = parsePagination(params)
      expect(result.page).toBe(1)
    })

    it('should clamp page 0 to 1', () => {
      const params = new URLSearchParams({ page: '0' })
      const result = parsePagination(params)
      expect(result.page).toBe(1)
    })

    it('should enforce max limit', () => {
      const params = new URLSearchParams({ limit: '500' })
      const result = parsePagination(params, { maxLimit: 100 })
      expect(result.limit).toBe(100)
    })

    it('should use custom defaults', () => {
      const params = new URLSearchParams()
      const result = parsePagination(params, { page: 2, limit: 10 })
      expect(result).toEqual({ page: 2, limit: 10, skip: 10 })
    })

    it('should calculate skip correctly', () => {
      const params = new URLSearchParams({ page: '5', limit: '10' })
      const result = parsePagination(params)
      expect(result.skip).toBe(40)
    })

    it('should handle NaN gracefully', () => {
      const params = new URLSearchParams({ page: 'abc', limit: 'xyz' })
      const result = parsePagination(params)
      // NaN → defaults
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })
  })

  describe('parseSort()', () => {
    it('should return defaults when no params', () => {
      const params = new URLSearchParams()
      const result = parseSort(params, ['createdAt', 'title'])
      expect(result).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' })
    })

    it('should accept allowed sort field', () => {
      const params = new URLSearchParams({ sort: 'title' })
      const result = parseSort(params, ['createdAt', 'title'])
      expect(result.sortBy).toBe('title')
    })

    it('should reject non-allowed sort field', () => {
      const params = new URLSearchParams({ sort: 'password' })
      const result = parseSort(params, ['createdAt', 'title'])
      expect(result.sortBy).toBe('createdAt') // fallback to default
    })

    it('should parse sort order', () => {
      const params = new URLSearchParams({ order: 'asc' })
      const result = parseSort(params, ['createdAt'])
      expect(result.sortOrder).toBe('asc')
    })

    it('should reject invalid sort order', () => {
      const params = new URLSearchParams({ order: 'random' })
      const result = parseSort(params, ['createdAt'])
      expect(result.sortOrder).toBe('desc') // fallback
    })
  })

  describe('parseFilters()', () => {
    it('should extract allowed filters', () => {
      const params = new URLSearchParams({ genre: 'action', year: '2024', hack: 'evil' })
      const result = parseFilters(params, ['genre', 'year'])
      expect(result).toEqual({ genre: 'action', year: '2024' })
      expect(result).not.toHaveProperty('hack')
    })

    it('should skip missing filters', () => {
      const params = new URLSearchParams({ genre: 'action' })
      const result = parseFilters(params, ['genre', 'year'])
      expect(result).toEqual({ genre: 'action' })
    })

    it('should return empty for no matches', () => {
      const params = new URLSearchParams({ hack: 'evil' })
      const result = parseFilters(params, ['genre', 'year'])
      expect(result).toEqual({})
    })
  })

  describe('getErrorMessage()', () => {
    it('should extract message from Error', () => {
      expect(getErrorMessage(new Error('Something failed'))).toBe('Something failed')
    })

    it('should return string directly', () => {
      expect(getErrorMessage('plain text error')).toBe('plain text error')
    })

    it('should return fallback for unknown types', () => {
      expect(getErrorMessage(42)).toBe('Lỗi không xác định')
      expect(getErrorMessage(null)).toBe('Lỗi không xác định')
    })

    it('should use custom fallback', () => {
      expect(getErrorMessage(null, 'custom fallback')).toBe('custom fallback')
    })

    it('should format ZodError', () => {
      try {
        z.object({ name: z.string() }).parse({ name: 123 })
      } catch (e) {
        const msg = getErrorMessage(e)
        expect(msg).toContain('name')
      }
    })
  })
})
