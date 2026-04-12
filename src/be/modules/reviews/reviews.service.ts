// ============================================
// Reviews Module — Service
// ============================================
// Now backed by the Review Prisma model.
// Legacy lib/data/reviews still exported for backward compat.

import { prisma } from '@/src/be/shared/db/prisma'
import type { CreateReviewInput } from './reviews.types'

export async function getReviewsByMovie(movieId: string, page = 1, perPage = 10) {
  const skip = (page - 1) * perPage
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { movieId, status: 'approved' },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.review.count({ where: { movieId, status: 'approved' } }),
  ])
  return { reviews, total, page, perPage }
}

export async function createReview(input: CreateReviewInput) {
  return prisma.review.upsert({
    where: { userId_movieId: { userId: input.userId, movieId: input.movieId } },
    update: {
      rating: input.rating,
      title: input.title ?? null,
      content: input.content ?? null,
      isSpoiler: input.isSpoiler ?? false,
    },
    create: {
      userId: input.userId,
      movieId: input.movieId,
      rating: input.rating,
      title: input.title ?? null,
      content: input.content ?? null,
      isSpoiler: input.isSpoiler ?? false,
      status: 'pending',
    },
  })
}

export async function getAverageRating(movieId: string) {
  const result = await prisma.review.aggregate({
    where: { movieId, status: 'approved' },
    _avg: { rating: true },
    _count: true,
  })
  return { average: result._avg.rating ?? 0, count: result._count }
}

// Legacy static reviews (backward compat)
export { getReviews, getReviewById } from '@/lib/data/reviews'
export type { ReviewItem } from '@/lib/data/reviews'
