// ============================================
// GET /api/v1/movies/most-liked — Most favorited movies
// ============================================
// Returns top 5 movies by favorite count for "Yêu thích nhất" ranking.
// Layer: Route/Controller → Direct Prisma query (simple read-only)

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Group favorites by movieId, count, sort descending
    const favoriteGroups = await prisma.favorite.groupBy({
      by: ['movieId'],
      _count: { movieId: true },
      orderBy: { _count: { movieId: 'desc' } },
      take: 5,
    })

    if (favoriteGroups.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch movie details for the top IDs
    const movieIds = favoriteGroups.map((g) => g.movieId)
    const movies = await prisma.movie.findMany({
      where: { id: { in: movieIds }, isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        posterUrl: true,
        thumbUrl: true,
      },
    })

    // Map and preserve ranking order
    const movieMap = new Map(movies.map((m) => [m.id, m]))
    const data = favoriteGroups
      .map((g, i) => {
        const movie = movieMap.get(g.movieId)
        if (!movie) return null
        return {
          rank: i + 1,
          movie: {
            id: movie.id,
            title: movie.title,
            slug: movie.slug,
            posterUrl: movie.posterUrl || movie.thumbUrl,
          },
          favoriteCount: g._count.movieId,
        }
      })
      .filter(Boolean)

    const res = NextResponse.json({ success: true, data })
    res.headers.set('Content-Type', 'application/json; charset=utf-8')
    return res
  } catch (error) {
    console.error('[API] GET /api/v1/movies/most-liked error:', error)
    const errRes = NextResponse.json(
      { success: false, message: 'Không thể tải phim yêu thích nhất' },
      { status: 500 }
    )
    errRes.headers.set('Content-Type', 'application/json; charset=utf-8')
    return errRes
  }
}
