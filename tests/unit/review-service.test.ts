// ============================================
// Unit Tests — Review Service
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixtures } from '@/tests/fixtures'

const { mockReviewRepo, mockCache } = vi.hoisted(() => ({
  mockReviewRepo: {
    findApproved: vi.fn(),
    findById: vi.fn(),
    findByMovie: vi.fn(),
    findRelated: vi.fn(),
    findTopRated: vi.fn(),
    incrementLike: vi.fn(),
  },
  mockCache: {
    getOrSet: vi.fn((_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(),
    invalidateTag: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/review.repository', () => ({ reviewRepository: mockReviewRepo }))
vi.mock('@/lib/cache', () => ({
  cache: mockCache,
  CacheKeys: {
    reviews: (p: number) => `reviews:list:${p}`,
    reviewDetail: (id: string) => `review:detail:${id}`,
  },
  CacheTags: { REVIEW: 'review' },
}))

import { reviewService } from '@/lib/services/review.service'

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.getOrSet.mockImplementation((_key: string, fetcher: () => unknown) => fetcher())
  })

  it('should return paginated approved reviews', async () => {
    mockReviewRepo.findApproved.mockResolvedValue({ data: [fixtures.review.approved], total: 1, page: 1, limit: 20 })
    const result = await reviewService.getApproved(1, 20)
    expect(result.data).toHaveLength(1)
  })

  it('should return review by id', async () => {
    mockReviewRepo.findById.mockResolvedValue(fixtures.review.approved)
    const result = await reviewService.getById('review-1')
    expect(result?.rating).toBe(9)
  })

  it('should return null for non-existent review', async () => {
    mockReviewRepo.findById.mockResolvedValue(null)
    expect(await reviewService.getById('xxx')).toBeNull()
  })

  it('should get reviews by movie', async () => {
    mockReviewRepo.findByMovie.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })
    await reviewService.getByMovie('movie-1', 1, 10)
    expect(mockReviewRepo.findByMovie).toHaveBeenCalledWith('movie-1', 1, 10)
  })

  it('should get top rated reviews', async () => {
    mockReviewRepo.findTopRated.mockResolvedValue([fixtures.review.approved])
    const result = await reviewService.getTopRated(10)
    expect(result).toHaveLength(1)
  })

  it('should increment like and invalidate cache', async () => {
    mockReviewRepo.incrementLike.mockResolvedValue({ id: 'review-1', likeCount: 6 })
    const result = await reviewService.likeReview('review-1')
    expect(result.likeCount).toBe(6)
    expect(mockCache.invalidate).toHaveBeenCalled()
    expect(mockCache.invalidateTag).toHaveBeenCalledWith('review')
  })
})
