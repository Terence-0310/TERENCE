// ============================================
// GET /api/v1/reviews/top — Top reviews for homepage carousel
// ============================================

import { NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'reviews-top' })

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: { select: { id: true, title: true, slug: true, posterUrl: true } },
      },
      orderBy: [
        { likeCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: reviews.map((r) => ({
        id: r.id,
        content: r.content,
        rating: r.rating,
        likeCount: r.likeCount,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
        movie: r.movie,
      })),
    }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error.message : error }, '/api/v1/reviews/top error')
    return NextResponse.json({ success: false, data: [], error: error.message }, { status: 500 })
  }
}
