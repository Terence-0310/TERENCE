// ============================================
// Unit Tests — API Query Param Helpers
// ============================================
// Covers: src/server/movies/api-helpers.ts

import { describe, it, expect } from 'vitest'
import { parseIntParam, parseStringParam, parseBoolParam } from '@/src/be/modules/movies/api-helpers'

describe('parseIntParam()', () => {
  it('should return default for null', () => {
    expect(parseIntParam(null, 10, 1, 100)).toBe(10)
  })

  it('should parse valid integer string', () => {
    expect(parseIntParam('42', 10, 1, 100)).toBe(42)
  })

  it('should return default for NaN', () => {
    expect(parseIntParam('abc', 10, 1, 100)).toBe(10)
  })

  it('should clamp to min', () => {
    expect(parseIntParam('-5', 10, 1, 100)).toBe(1)
  })

  it('should clamp to max', () => {
    expect(parseIntParam('999', 10, 1, 100)).toBe(100)
  })

  it('should handle edge: exact min', () => {
    expect(parseIntParam('1', 10, 1, 100)).toBe(1)
  })

  it('should handle edge: exact max', () => {
    expect(parseIntParam('100', 10, 1, 100)).toBe(100)
  })

  it('should handle empty string', () => {
    expect(parseIntParam('', 10, 1, 100)).toBe(10)
  })

  it('should handle float strings (parseInt ignores decimal)', () => {
    expect(parseIntParam('42.7', 10, 1, 100)).toBe(42)
  })
})

describe('parseStringParam()', () => {
  it('should return undefined for null', () => {
    expect(parseStringParam(null)).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    expect(parseStringParam('')).toBeUndefined()
    expect(parseStringParam('   ')).toBeUndefined()
  })

  it('should return trimmed value without allowlist', () => {
    expect(parseStringParam('  hello  ')).toBe('hello')
  })

  it('should accept value in allowlist', () => {
    expect(parseStringParam('movie', ['movie', 'series'])).toBe('movie')
  })

  it('should reject value not in allowlist', () => {
    expect(parseStringParam('podcast', ['movie', 'series'])).toBeUndefined()
  })

  it('should be case-sensitive for allowlist', () => {
    expect(parseStringParam('Movie', ['movie', 'series'])).toBeUndefined()
  })
})

describe('parseBoolParam()', () => {
  it('should return undefined for null', () => {
    expect(parseBoolParam(null)).toBeUndefined()
  })

  it('should parse true values', () => {
    expect(parseBoolParam('true')).toBe(true)
    expect(parseBoolParam('1')).toBe(true)
  })

  it('should parse false values', () => {
    expect(parseBoolParam('false')).toBe(false)
    expect(parseBoolParam('0')).toBe(false)
  })

  it('should return undefined for invalid values', () => {
    expect(parseBoolParam('yes')).toBeUndefined()
    expect(parseBoolParam('no')).toBeUndefined()
    expect(parseBoolParam('abc')).toBeUndefined()
  })
})
