// ============================================
// Review Repository — Database access layer
// ============================================

import { prisma } from '@/lib/auth/db'

export const reviewRepository = {
  /**
   * Get approved reviews with pagination
   */
  async findApproved(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where: { status: 'approved' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          movie: {
            select: {
              id: true,
              slug: true,
              title: true,
              posterUrl: true,
              thumbUrl: true,
              year: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { status: 'approved' } }),
    ])

    return { data, total, page, limit }
  },

  /**
   * Get single review by id
   */
  async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            thumbUrl: true,
            backdropUrl: true,
            year: true,
            rating: true,
          },
        },
      },
    })
  },

  /**
   * Get reviews for a specific movie
   */
  async findByMovie(movieId: string, page: number, limit: number) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where: { movieId, status: 'approved' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { movieId, status: 'approved' } }),
    ])

    return { data, total, page, limit }
  },

  /**
   * Get related reviews (same genre movies)
   */
  async findRelated(reviewId: string, limit = 6) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { movieId: true },
    })
    if (!review) return []

    return prisma.review.findMany({
      where: {
        id: { not: reviewId },
        status: 'approved',
        movie: { isActive: true },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Increment like count
   */
  async incrementLike(id: string) {
    return prisma.review.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    })
  },

  /**
   * Get top-rated reviews (for homepage section)
   */
  async findTopRated(limit = 10) {
    return prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            thumbUrl: true,
            year: true,
          },
        },
      },
      orderBy: [{ likeCount: 'desc' }, { rating: 'desc' }],
      take: limit,
    })
  },
}
