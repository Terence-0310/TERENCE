// ============================================
// Unit Tests — Rate Limiter
// ============================================

import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/src/be/shared/rate-limit'

describe('rateLimit', () => {
  it('should allow requests within limit', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 3 })

    const r1 = limiter.check('user-a')
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = limiter.check('user-a')
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = limiter.check('user-a')
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('should block when limit exceeded', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 2 })

    limiter.check('user-b')
    limiter.check('user-b')
    const r3 = limiter.check('user-b')
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('should track different keys independently', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 })

    const r1 = limiter.check('user-x')
    expect(r1.allowed).toBe(true)

    const r2 = limiter.check('user-y')
    expect(r2.allowed).toBe(true)

    // user-x should be blocked now
    const r3 = limiter.check('user-x')
    expect(r3.allowed).toBe(false)
  })

  it('should have resetMs in the future', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })
    const result = limiter.check('user-t')
    expect(result.resetMs).toBeGreaterThan(Date.now())
  })

  it('should use default options', () => {
    const limiter = rateLimit()
    const result = limiter.check('default-test')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9) // default maxRequests = 10
  })
})
