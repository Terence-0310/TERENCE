import { redis } from './redis'

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const data = await redis.get(key)
    if (!data) return null
    return JSON.parse(data) as T
  } catch (error) {
    console.warn(`[Cache] Error reading key ${key}:`, error)
    return null
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
  if (!redis) return
  try {
    const data = JSON.stringify(value)
    await redis.setex(key, ttlSeconds, data)
  } catch (error) {
    console.warn(`[Cache] Error writing key ${key}:`, error)
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(key)
  } catch (error) {
    console.warn(`[Cache] Error deleting key ${key}:`, error)
  }
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  if (!redis) return
  try {
    let cursor = '0'
    do {
      const result = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
      cursor = result[0]
      const keys = result[1]
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (error) {
    console.warn(`[Cache] Error invalidating prefix ${prefix}:`, error)
  }
}

export const CACHE_TTL = {
  LIST: 300,        // 5 minutes
  DETAIL: 1800,     // 30 minutes
  HOME: 180,        // 3 minutes
  EPISODES: 1800,   // 30 minutes
}
