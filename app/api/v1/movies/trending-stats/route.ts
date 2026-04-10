// ============================================
// GET /api/v1/movies/trending-stats — Most viewed movies
// ============================================
// Returns top 5 movies by viewCount for "Sôi nổi nhất" ranking.
// Layer: Route/Controller → Direct Prisma query (simple read-only)

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      where: { isActive: true, isPublished: true },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        posterUrl: true,
        thumbUrl: true,
        viewCount: true,
      },
    })

    const res = NextResponse.json({
      success: true,
      data: movies.map((m, i) => ({
        rank: i + 1,
        movie: {
          id: m.id,
          title: m.title,
          slug: m.slug,
          posterUrl: m.posterUrl || m.thumbUrl,
        },
        viewCount: m.viewCount,
      })),
    })
    res.headers.set('Content-Type', 'application/json; charset=utf-8')
    return res
  } catch (error) {
    console.error('[API] GET /api/v1/movies/trending-stats error:', error)
    const errRes = NextResponse.json(
      { success: false, message: 'Không thể tải phim sôi nổi' },
      { status: 500 }
    )
    errRes.headers.set('Content-Type', 'application/json; charset=utf-8')
    return errRes
  }
}
