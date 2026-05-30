import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'reviews' })

// Strict Zod schema for POST. Rejects unknown fields and validates types.
const reviewCreateSchema = z.object({
  movieId: z.string().trim().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(5000),
  isSpoiler: z.boolean().optional().default(false),
}).strict()

// ── GET /api/v1/reviews ───────────────────────────────────────────────
// Public listing — phục vụ trang /reviews (giao diện đánh giá phim).
// Query:
//   page (default 1), limit (default 12, max 48)
//   sort = recent (default) | popular | rating
//   rating = 1..5 (lọc theo số sao tối thiểu)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10) || 12))
    const sort = url.searchParams.get('sort') || 'recent'
    const ratingMin = parseInt(url.searchParams.get('rating') || '0', 10) || 0

    const where: any = { status: 'approved' }
    if (ratingMin >= 1 && ratingMin <= 5) where.rating = { gte: ratingMin }

    const orderBy: any =
      sort === 'popular'
        ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
        : sort === 'rating'
        ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }]

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          movie: { select: { id: true, title: true, slug: true, posterUrl: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    const data = items.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      isSpoiler: r.isSpoiler,
      likeCount: r.likeCount,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
      movie: r.movie,
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập để bình luận' }, { status: 401 })
    }

    // Strict Zod validation — rejects unknown fields, normalises rating/content.
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = reviewCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const { movieId, rating, content, isSpoiler } = parsed.data

    // Atomic create-review. The TCoin reward is intentionally credited
    // OUTSIDE this transaction via `rewardReview()` — that service uses its
    // own short-lived $transaction, owns the audit row, and enforces the
    // `review_reward` daily cap (3/day, 10 TCoin each). Crediting inside
    // this tx would duplicate the category logic and bypass the daily cap.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { userId_movieId: { userId, movieId } },
        select: { id: true },
      })
      if (existing) {
        return { kind: 'duplicate' as const }
      }

      const review = await tx.review.create({
        data: {
          userId,
          movieId,
          rating,
          content,
          isSpoiler,
          // Auto-approve: there is no admin moderation flow, so 'pending'
          // reviews would never become visible. Approve on submit so they
          // show (and can be broadcast live to other viewers).
          status: 'approved',
        },
        include: {
          user: {
            select: {
              id: true, name: true, avatar: true,
              avatarFrameUntil: true, exclusiveBadgeUntil: true,
            },
          },
        },
      })

      return { kind: 'ok' as const, review }
    })

    if (result.kind === 'duplicate') {
      return NextResponse.json({ success: false, error: 'Bạn đã đánh giá bộ phim này rồi' }, { status: 409 })
    }

    const { review } = result

    // Reward TCoin via the canonical reward service. Failures are non-fatal:
    // the review is already created and the cap-exhaustion case (3/day) is
    // a regular `ok:false` rather than an exception.
    let tcoinRewarded = false
    try {
      const { rewardReview } = await import('@/src/be/modules/tcoin/tcoin.service')
      const rr = await rewardReview(userId, review.id)
      tcoinRewarded = rr.ok
    } catch (err) {
      log.error({ userId, reviewId: review.id, err: err instanceof Error ? err.message : err }, 'rewardReview failed')
    }
    const now = Date.now()
    const frameActive = !!review.user.avatarFrameUntil && new Date(review.user.avatarFrameUntil).getTime() > now
    const badgeActive = !!review.user.exclusiveBadgeUntil && new Date(review.user.exclusiveBadgeUntil).getTime() > now

    const payload = {
      id: review.id,
      author: review.user.name,
      avatar: review.user.avatar,
      frameActive,
      badgeActive,
      text: review.content,
      rating: review.rating,
      date: new Date(review.createdAt).toLocaleString('vi-VN'),
      createdAt: review.createdAt,
      isSpoiler: review.isSpoiler,
      likeCount: review.likeCount,
    }

    // Broadcast to everyone viewing this movie so the comment appears live.
    try {
      const { notifyRoom, RT_EVENTS } = await import('@/src/be/shared/realtime/notify')
      notifyRoom(`movie:${movieId}`, RT_EVENTS.REVIEW_CREATED, { ...payload, movieId })
    } catch { /* realtime is best-effort */ }

    return NextResponse.json({ success: true, tcoinRewarded, data: payload })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'POST /api/v1/reviews error')
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
