import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/src/be/shared/db/prisma'
import { redis } from '@/src/lib/redis'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'review-like' })
const DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 365

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const dedupeKey = `review:like:${id}:${userId}`

  // Redis is a cache/idempotency layer only — Prisma is the source of truth for likeCount.
  // Fast-path: if Redis already says this user liked the review, skip DB write.
  if (redis) {
    try {
      const exists = await redis.get(dedupeKey)
      if (exists) {
        const current = await prisma.review.findUnique({
          where: { id },
          select: { id: true, likeCount: true },
        })
        if (!current) {
          return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data: current, alreadyLiked: true })
      }
    } catch (err) {
      // Non-fatal: degrade to DB-only path.
      log.warn({ err: err instanceof Error ? err.message : err, id, userId }, 'Redis GET failed; falling through to DB')
    }
  }

  // Atomic increment in DB. If this throws (e.g. review not found, DB down)
  // we propagate the error — no Redis key has been set yet, so nothing to roll back.
  let review
  try {
    review = await prisma.review.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err, id, userId }, 'POST review like: prisma update failed')
    return NextResponse.json({ success: false, error: 'Failed to like review' }, { status: 500 })
  }

  // DB committed — now set Redis idempotency key. If Redis fails, we log but still
  // return success (the like is durable). If a subsequent Redis SET succeeds, we
  // also tolerate the rare race where another concurrent like already set it.
  if (redis) {
    try {
      await redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL_SECONDS, 'NX')
    } catch (err) {
      log.warn({ err: err instanceof Error ? err.message : err, id, userId }, 'Redis SET after like failed; dedupe degraded')
    }
  }

  return NextResponse.json({ success: true, data: review })
}
