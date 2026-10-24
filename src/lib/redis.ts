// ============================================
// Redis Client — Singleton + Health Check + Diagnostics
// ============================================
// Provides a production-grade Redis client with:
//   - Singleton pattern (prevents connection leaks in dev hot-reload)
//   - Automatic reconnection with exponential backoff
//   - Health check & diagnostics API for monitoring
//   - Graceful error suppression (never crashes the app)
//
// Usage:
//   import { redis, getRedisInfo } from '@/src/lib/redis'
//   if (redis) { await redis.get('key') }

import { Redis } from 'ioredis'
import { logger } from '@/src/be/shared/utils/logger'

const REDIS_URL = process.env.REDIS_URL
const log = logger.child({ module: 'redis' })

// ── Singleton ──
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
  redisConnectedAt: number | undefined
}

function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms... max 5s
      if (times > 10) return null // Give up after 10 retries
      return Math.min(times * 100 * Math.pow(2, Math.floor(times / 3)), 5000)
    },
    enableOfflineQueue: false,
    connectTimeout: 5000,
    lazyConnect: false, // Connect immediately
    // Keep-alive to prevent stale connections
    keepAlive: 30000,
  })

  // ── Connection event handlers ──
  client.on('connect', () => {
    globalForRedis.redisConnectedAt = Date.now()
    log.info({ url: url.replace(/\/\/.*@/, '//<credentials>@') }, 'Connected')
  })

  client.on('ready', () => {
    log.info('Ready — accepting commands')
  })

  client.on('close', () => {
    log.warn('Connection closed')
  })

  client.on('reconnecting', (delay: number) => {
    log.info({ delayMs: delay }, 'Reconnecting')
  })

  // Suppress repeated error spam by tracking first error per client.
  const errorState = new WeakMap<Redis, boolean>()
  client.on('error', (err) => {
    if (!errorState.get(client)) {
      log.error({ err: err.message }, 'Redis error')
      errorState.set(client, true)
    }
  })

  client.on('end', () => {
    log.warn('Connection ended')
  })

  return client
}

export const redis: Redis | null = REDIS_URL
  ? globalForRedis.redis || createRedisClient(REDIS_URL)
  : null

// Cached in every environment: server.ts and the Next.js bundles load separate
// copies of this module in one process and must share one connection.
if (redis) {
  globalForRedis.redis = redis
}

// ============================================
// Health Check & Diagnostics
// ============================================

export interface RedisHealthInfo {
  status: 'connected' | 'disconnected' | 'not_configured'
  latencyMs: number | null
  uptimeSeconds: number | null
  connectedAt: string | null
  memoryUsage: string | null
  totalKeys: number | null
  hitRate: string | null
  version: string | null
}

/**
 * Get comprehensive Redis health and performance info.
 * Safe to call — never throws, returns status info even if Redis is down.
 */
export async function getRedisInfo(): Promise<RedisHealthInfo> {
  if (!redis) {
    return {
      status: 'not_configured',
      latencyMs: null,
      uptimeSeconds: null,
      connectedAt: null,
      memoryUsage: null,
      totalKeys: null,
      hitRate: null,
      version: null,
    }
  }

  try {
    // Measure latency via PING
    const pingStart = performance.now()
    await redis.ping()
    const latencyMs = Math.round((performance.now() - pingStart) * 100) / 100

    // Get INFO from Redis
    const info = await redis.info()
    
    // Parse useful metrics from INFO output
    const parseField = (field: string): string | null => {
      const match = info.match(new RegExp(`${field}:(.+)\\r?\\n`))
      return match ? match[1].trim() : null
    }

    const uptimeRaw = parseField('uptime_in_seconds')
    const memoryRaw = parseField('used_memory_human')
    const totalKeysRaw = parseField('db0')
    const hitsRaw = parseField('keyspace_hits')
    const missesRaw = parseField('keyspace_misses')
    const versionRaw = parseField('redis_version')

    // Calculate hit rate
    let hitRate: string | null = null
    if (hitsRaw && missesRaw) {
      const hits = parseInt(hitsRaw)
      const misses = parseInt(missesRaw)
      const total = hits + misses
      hitRate = total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : '0%'
    }

    // Parse total keys from db0 info
    let totalKeys: number | null = null
    if (totalKeysRaw) {
      const keysMatch = totalKeysRaw.match(/keys=(\d+)/)
      if (keysMatch) totalKeys = parseInt(keysMatch[1])
    }

    return {
      status: 'connected',
      latencyMs,
      uptimeSeconds: uptimeRaw ? parseInt(uptimeRaw) : null,
      connectedAt: globalForRedis.redisConnectedAt
        ? new Date(globalForRedis.redisConnectedAt).toISOString()
        : null,
      memoryUsage: memoryRaw,
      totalKeys,
      hitRate,
      version: versionRaw,
    }
  } catch {
    return {
      status: 'disconnected',
      latencyMs: null,
      uptimeSeconds: null,
      connectedAt: null,
      memoryUsage: null,
      totalKeys: null,
      hitRate: null,
      version: null,
    }
  }
}

// ============================================
// Cache Utility Functions
// ============================================

/**
 * Generic cache-aside pattern for Redis.
 * Reads from cache first, falls back to fetcher, then caches the result.
 * Safe — never throws even if Redis is down.
 * 
 * @param key - Redis key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Function to call if cache miss
 * @returns The cached or freshly-fetched data
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  /** Return false to skip caching this result (e.g. an empty list from a failing upstream). */
  shouldCache: (data: T) => boolean = () => true,
): Promise<T> {
  if (!redis) return fetcher()

  try {
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {
    // Cache read failed — fall through to fetcher
  }

  const data = await fetcher()
  if (!shouldCache(data)) return data

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    // Cache write failed — non-critical, data was already fetched
  }

  return data
}

/**
 * Invalidate a specific cache key or pattern.
 * 
 * @param keyOrPattern - Exact key to delete, or glob pattern for SCAN-based deletion
 */
export async function invalidateCache(keyOrPattern: string): Promise<number> {
  if (!redis) return 0

  try {
    // If it's a pattern (contains *), use SCAN + DEL
    if (keyOrPattern.includes('*')) {
      let cursor = '0'
      let deleted = 0
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor, 'MATCH', keyOrPattern, 'COUNT', 100
        )
        cursor = nextCursor
        if (keys.length > 0) {
          deleted += await redis.del(...keys)
        }
      } while (cursor !== '0')
      return deleted
    }

    // Exact key
    return await redis.del(keyOrPattern)
  } catch {
    return 0
  }
}

/**
 * Get all cache keys matching a pattern with their TTLs.
 * Useful for debugging cache state.
 */
export async function listCacheKeys(
  pattern: string = '*',
  limit: number = 100,
): Promise<{ key: string; ttl: number; size: number }[]> {
  if (!redis) return []

  try {
    const results: { key: string; ttl: number; size: number }[] = []
    let cursor = '0'

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor, 'MATCH', pattern, 'COUNT', 50
      )
      cursor = nextCursor

      for (const key of keys) {
        if (results.length >= limit) break
        const [ttl, size] = await Promise.all([
          redis.ttl(key),
          redis.strlen(key),
        ])
        results.push({ key, ttl, size })
      }
    } while (cursor !== '0' && results.length < limit)

    return results.sort((a, b) => a.key.localeCompare(b.key))
  } catch {
    return []
  }
}
