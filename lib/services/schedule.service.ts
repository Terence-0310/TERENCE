// ============================================
// Schedule Service — Business logic layer
// ============================================

import { scheduleRepository } from '@/lib/repositories/schedule.repository'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'

const TTL = {
  SCHEDULE: 300, // 5 min
} as const

export const scheduleService = {
  async getByDate(dateStr: string) {
    return cache.getOrSet(
      CacheKeys.schedule(dateStr),
      () => scheduleRepository.findByDate(dateStr),
      { ttl: TTL.SCHEDULE, tags: [CacheTags.SCHEDULE] },
    )
  },

  async getRecent(days = 7) {
    return cache.getOrSet(
      'schedule:recent',
      () => scheduleRepository.findRecent(days),
      { ttl: TTL.SCHEDULE, tags: [CacheTags.SCHEDULE] },
    )
  },

  async getAvailableDates(days = 14) {
    return cache.getOrSet(
      'schedule:dates',
      () => scheduleRepository.findAvailableDates(days),
      { ttl: TTL.SCHEDULE, tags: [CacheTags.SCHEDULE] },
    )
  },
}
