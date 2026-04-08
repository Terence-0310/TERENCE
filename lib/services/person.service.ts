// ============================================
// Person Service — Business logic layer
// ============================================

import { personRepository } from '@/lib/repositories/person.repository'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'

const TTL = {
  LIST: 600,    // 10 min
  DETAIL: 900,  // 15 min
} as const

export const personService = {
  async getPopular(page = 1, limit = 24) {
    return cache.getOrSet(
      CacheKeys.popularActors(page),
      () => personRepository.findPopular(page, limit),
      { ttl: TTL.LIST, tags: [CacheTags.PERSON] },
    )
  },

  async getBySlug(slug: string) {
    return cache.getOrSet(
      CacheKeys.personDetail(slug),
      () => personRepository.findBySlug(slug),
      { ttl: TTL.DETAIL, tags: [CacheTags.PERSON] },
    )
  },

  async search(query: string, limit = 10) {
    return personRepository.search(query, limit)
  },
}
