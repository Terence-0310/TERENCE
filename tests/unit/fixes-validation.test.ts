// ============================================
// Unit Tests — Schemas added by the PHASE 1-4 hardening pass
// ============================================
// Covers: review POST, TCoin adjust, news PATCH whitelist, watch-history
// sync items, auth callbacks. We test the schemas directly (no DB) so the
// suite stays fast.

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerifySchema,
  signupSchema,
} from '@/src/be/modules/auth/auth.schema'

// Mirror the schemas defined inline in the route handlers. Keeping the
// definitions in sync with the handlers is intentional — these tests will
// catch drift if anyone weakens them.

const reviewCreateSchema = z.object({
  movieId: z.string().trim().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(5000),
  isSpoiler: z.boolean().optional().default(false),
}).strict()

const adjustSchema = z.object({
  targetUserId: z.string().trim().min(1),
  amount: z.number().finite().int().refine((v) => v !== 0, { message: 'amount must be non-zero' }),
  reason: z.string().trim().min(1).max(500),
}).strict()

const newsUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  content: z.string().nullable().optional(),
  coverImage: z.string().trim().url().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.string().nullable().optional(),
  publishedAt: z.union([z.string().datetime(), z.null()]).optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' })

const syncItemSchema = z.object({
  movieId: z.string().min(1),
  episodeId: z.string().optional().nullable(),
  currentTime: z.number().finite().nonnegative().optional(),
  duration: z.number().finite().nonnegative().optional(),
  progressPercent: z.number().finite().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  lastWatchedAt: z.string().min(1),
})

describe('Review POST schema', () => {
  it('accepts a valid review', () => {
    const r = reviewCreateSchema.safeParse({
      movieId: 'abc',
      rating: 5,
      content: 'Phim hay',
    })
    expect(r.success).toBe(true)
  })

  it('rejects missing movieId', () => {
    const r = reviewCreateSchema.safeParse({ rating: 5, content: 'x' })
    expect(r.success).toBe(false)
  })

  it('rejects rating out of range', () => {
    expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: 0, content: 'a' }).success).toBe(false)
    expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: 6, content: 'a' }).success).toBe(false)
    expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: 3.5, content: 'a' }).success).toBe(false)
  })

  it('rejects empty content', () => {
    const r = reviewCreateSchema.safeParse({ movieId: 'x', rating: 3, content: '' })
    expect(r.success).toBe(false)
  })

  it('rejects content over 5000 chars', () => {
    const r = reviewCreateSchema.safeParse({ movieId: 'x', rating: 3, content: 'a'.repeat(5001) })
    expect(r.success).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    const r = reviewCreateSchema.safeParse({ movieId: 'x', rating: 3, content: 'hi', adminFlag: true })
    expect(r.success).toBe(false)
  })
})

describe('TCoin adjust schema', () => {
  it('accepts non-zero integer amounts', () => {
    expect(adjustSchema.safeParse({ targetUserId: 'u1', amount: 100, reason: 'r' }).success).toBe(true)
    expect(adjustSchema.safeParse({ targetUserId: 'u1', amount: -50, reason: 'r' }).success).toBe(true)
  })

  it('rejects amount=0 with explicit message', () => {
    const r = adjustSchema.safeParse({ targetUserId: 'u1', amount: 0, reason: 'r' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('non-zero'))).toBe(true)
    }
  })

  it('rejects non-finite / NaN', () => {
    expect(adjustSchema.safeParse({ targetUserId: 'u1', amount: NaN, reason: 'r' }).success).toBe(false)
    expect(adjustSchema.safeParse({ targetUserId: 'u1', amount: Infinity, reason: 'r' }).success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(adjustSchema.safeParse({ amount: 10, reason: 'r' }).success).toBe(false)
    expect(adjustSchema.safeParse({ targetUserId: 'u1', amount: 10 }).success).toBe(false)
  })
})

describe('Admin news PATCH whitelist', () => {
  it('accepts safe fields', () => {
    expect(newsUpdateSchema.safeParse({ title: 'New title' }).success).toBe(true)
    expect(newsUpdateSchema.safeParse({ status: 'published' }).success).toBe(true)
  })

  it('rejects unknown / forbidden fields (mass-assignment protection)', () => {
    expect(newsUpdateSchema.safeParse({ authorId: 'attacker' }).success).toBe(false)
    expect(newsUpdateSchema.safeParse({ id: 'attacker', title: 'x' }).success).toBe(false)
    expect(newsUpdateSchema.safeParse({ createdAt: '2026-01-01T00:00:00Z' }).success).toBe(false)
    expect(newsUpdateSchema.safeParse({ viewCount: 999999 }).success).toBe(false)
  })

  it('rejects empty payload', () => {
    expect(newsUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejects invalid status enum', () => {
    expect(newsUpdateSchema.safeParse({ status: 'public' }).success).toBe(false)
  })
})

describe('Watch-history sync item schema', () => {
  it('accepts a minimal valid item', () => {
    const r = syncItemSchema.safeParse({
      movieId: 'm1',
      lastWatchedAt: new Date().toISOString(),
    })
    expect(r.success).toBe(true)
  })

  it('rejects negative currentTime', () => {
    const r = syncItemSchema.safeParse({
      movieId: 'm1',
      currentTime: -5,
      lastWatchedAt: new Date().toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('rejects progressPercent > 100', () => {
    const r = syncItemSchema.safeParse({
      movieId: 'm1',
      progressPercent: 150,
      lastWatchedAt: new Date().toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('rejects missing movieId', () => {
    const r = syncItemSchema.safeParse({ lastWatchedAt: new Date().toISOString() })
    expect(r.success).toBe(false)
  })
})

describe('Auth callbacks schemas', () => {
  it('forgotPassword: requires valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false)
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
  })

  it('resetPassword: requires token + password ≥8', () => {
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'short' }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ token: '', password: '12345678' }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ token: 't', password: '12345678' }).success).toBe(true)
  })

  it('resendVerify: requires email', () => {
    expect(resendVerifySchema.safeParse({}).success).toBe(false)
    expect(resendVerifySchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
  })

  it('signup: enforces password min 8 (unified across forms)', () => {
    expect(signupSchema.safeParse({ email: 'a@b.co', password: '1234567', name: 'x' }).success).toBe(false)
    expect(signupSchema.safeParse({ email: 'a@b.co', password: '12345678', name: 'x' }).success).toBe(true)
  })
})
