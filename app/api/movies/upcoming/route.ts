// ============================================
// API Route: GET /api/movies/upcoming
// ============================================
// Upcoming movies from TMDB with region fallback.
// Response: ApiListResponse<UpcomingMovieItem>

import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingMovies } from '@/lib/news/tmdb-news'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const region = searchParams.get('region') || 'VN'
  const pageStr = searchParams.get('page')
  const page = pageStr ? Math.max(parseInt(pageStr, 10) || 1, 1) : 1

  try {
    const { items, total } = await getUpcomingMovies(region, page)

    return NextResponse.json(
      {
        items,
        total,
        source: 'tmdb',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      },
    )
  } catch {
    return NextResponse.json({
      items: [],
      total: 0,
      source: 'tmdb',
      fetchedAt: new Date().toISOString(),
    })
  }
}
