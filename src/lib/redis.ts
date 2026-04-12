import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = REDIS_URL
  ? globalForRedis.redis || new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null // Stop retrying after 3 times to prevent long stalls
        return Math.min(times * 100, 2000)
      },
      enableOfflineQueue: false // Fail fast if Redis is temporarily unreachable
    })
  : null

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redis = redis
}

if (redis) {
  redis.on('error', (err) => {
    // Suppress heavy logging on error to just one warning
    // so we don't spam the console if Redis is misconfigured
  })
}
