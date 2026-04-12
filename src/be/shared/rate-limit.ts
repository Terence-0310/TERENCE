// ============================================
// In-Memory Rate Limiter
// ============================================
// Lightweight, zero-dependency rate limiter for Next.js API routes.
// Uses a simple sliding-window counter stored in a Map.
//
// LIMITATIONS (documented per Sprint 5A-BE):
//   - In-memory only — resets on server restart
//   - Not shared across PM2 cluster instances
//   - Suitable for basic abuse prevention, NOT DDoS protection
//   - For production scale: upgrade to Redis-backed limiter or Cloudflare Rate Limiting
//
// Usage:
//   import { rateLimit, RateLimitResult } from '@/src/be/shared/rate-limit'
//
//   const limiter = rateLimit({ windowMs: 60_000, maxRequests: 10 })
//
//   export async function POST(req: NextRequest) {
//     const result = limiter.check(getClientIdentifier(req))
//     if (!result.allowed) {
//       return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau', 429)
//     }
//     // ... handle request
//   }

import { NextRequest } from 'next/server'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number
  /** Max requests allowed per window (default: 10) */
  maxRequests?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

interface WindowEntry {
  count: number
  startMs: number
}

// -------------------------------------------------------------------
// Rate Limiter Factory
// -------------------------------------------------------------------
export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000
  const maxRequests = options.maxRequests ?? 10

  const store = new Map<string, WindowEntry>()

  // Periodic cleanup to prevent memory leak (every 5 minutes)
  let lastCleanup = Date.now()
  const CLEANUP_INTERVAL = 5 * 60 * 1000

  function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now

    for (const [key, entry] of store) {
      if (now - entry.startMs > windowMs) {
        store.delete(key)
      }
    }
  }

  function check(key: string): RateLimitResult {
    cleanup()

    const now = Date.now()
    const entry = store.get(key)

    // No existing entry or window expired — start fresh
    if (!entry || now - entry.startMs > windowMs) {
      store.set(key, { count: 1, startMs: now })
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetMs: now + windowMs,
      }
    }

    // Within window — increment
    entry.count++

    if (entry.count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: entry.startMs + windowMs,
      }
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetMs: entry.startMs + windowMs,
    }
  }

  return { check }
}

// -------------------------------------------------------------------
// Helper: extract client identifier from request
// -------------------------------------------------------------------
// Uses IP address as the rate limit key.
// Falls back to 'unknown' if no IP can be determined.
export function getClientIdentifier(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
