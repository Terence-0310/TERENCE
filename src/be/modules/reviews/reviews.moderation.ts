// ============================================
// Reviews — moderation (admin)
// ============================================
// Approve/reject pending reviews. Approving makes the review visible, pushes
// it live to everyone in the movie room, notifies the author, and notifies
// users who favorited (follow) the movie.

import { prisma } from '@/src/be/shared/db/prisma'
import { notifyRoom, RT_EVENTS } from '@/src/be/shared/realtime/notify'
import { createNotification } from '@/src/be/modules/notifications/notifications.service'

function movieLink(m: { slug: string | null; tmdbId: number | null; contentType: string }): string | null {
  const isSeries = ['series', 'tv', 'anime'].includes(m.contentType ?? '')
  if (m.tmdbId) return `/${isSeries ? 'tv' : 'movie'}/${m.tmdbId}`
  return m.slug ? `/watch/${m.slug}` : null
}

export async function listPendingReviews(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first — FIFO moderation queue
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { status: 'pending' } }),
  ])
  return { items: rows, total, page, limit }
}

export async function rejectReview(reviewId: string) {
  return prisma.review.update({ where: { id: reviewId }, data: { status: 'rejected' } })
}

export async function approveReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: 'approved' },
    include: {
      user: {
        select: {
          id: true, name: true, avatar: true,
          avatarFrameUntil: true, exclusiveBadgeUntil: true,
        },
      },
      movie: { select: { id: true, title: true, slug: true, tmdbId: true, contentType: true } },
    },
  })

  const now = Date.now()
  const payload = {
    id: review.id,
    movieId: review.movieId,
    author: review.user.name,
    avatar: review.user.avatar,
    frameActive: !!review.user.avatarFrameUntil && new Date(review.user.avatarFrameUntil).getTime() > now,
    badgeActive: !!review.user.exclusiveBadgeUntil && new Date(review.user.exclusiveBadgeUntil).getTime() > now,
    text: review.content,
    rating: review.rating,
    date: new Date(review.createdAt).toLocaleString('vi-VN'),
    createdAt: review.createdAt,
    isSpoiler: review.isSpoiler,
    likeCount: review.likeCount,
  }

  // 1) Live broadcast so it appears for everyone viewing the movie.
  try {
    notifyRoom(`movie:${review.movieId}`, RT_EVENTS.REVIEW_CREATED, payload)
  } catch { /* best-effort */ }

  const link = movieLink(review.movie)
  const movieTitle = review.movie?.title ?? 'phim'

  // 2) Tell the author their review is now public.
  try {
    await createNotification({
      userId: review.userId,
      type: 'review_approved',
      title: 'Đánh giá của bạn đã được duyệt',
      message: `Đánh giá của bạn về "${movieTitle}" đã được hiển thị công khai.`,
      link,
    })
  } catch { /* best-effort */ }

  // 3) Notify users who follow (favorited) this movie — excluding the author.
  try {
    const followers = await prisma.favorite.findMany({
      where: { movieId: review.movieId, userId: { not: review.userId } },
      select: { userId: true },
      take: 500, // safety cap on fan-out
    })
    await Promise.all(
      followers.map((f) =>
        createNotification({
          userId: f.userId,
          type: 'followed_movie_review',
          title: 'Có đánh giá mới cho phim bạn theo dõi',
          message: `"${movieTitle}" vừa có một đánh giá mới.`,
          link,
        }).catch(() => {}),
      ),
    )
  } catch { /* best-effort */ }

  return review
}
