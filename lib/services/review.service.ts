// ============================================
// Review Service — Business logic layer
// ============================================

import { reviewRepository } from '@/lib/repositories/review.repository'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'

const TTL = {
  LIST: 300,    // 5 min
  DETAIL: 600,  // 10 min
} as const

export const reviewService = {
  async getApproved(page = 1, limit = 20) {
    return cache.getOrSet(
      CacheKeys.reviews(page),
      () => reviewRepository.findApproved(page, limit),
      { ttl: TTL.LIST, tags: [CacheTags.REVIEW] },
    )
  },

  async getById(id: string) {
    return cache.getOrSet(
      CacheKeys.reviewDetail(id),
      () => reviewRepository.findById(id),
      { ttl: TTL.DETAIL, tags: [CacheTags.REVIEW] },
    )
  },

  async getByMovie(movieId: string, page = 1, limit = 10) {
    return reviewRepository.findByMovie(movieId, page, limit)
  },

  async getRelated(reviewId: string, limit = 6) {
    return reviewRepository.findRelated(reviewId, limit)
  },

  async getTopRated(limit = 10) {
    return reviewRepository.findTopRated(limit)
  },

  async likeReview(id: string) {
    const result = await reviewRepository.incrementLike(id)
    cache.invalidate(CacheKeys.reviewDetail(id))
    cache.invalidateTag(CacheTags.REVIEW)
    return result
  },
}
