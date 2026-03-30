// ============================================
// API Route: GET /api/news/related
// ============================================
// Related news for a specific movie.
// Query: q (required), title, year, limit
// Response: ApiListResponse<NewsArticle>

import { NextRequest, NextResponse } from 'next/server'
import { getRelatedMovieNews } from '@/lib/news/articles'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const query = searchParams.get('q')
  if (!query || !query.trim()) {
    return NextResponse.json({
      items: [],
      total: 0,
      source: 'gnews',
      fetchedAt: new Date().toISOString(),
    })
  }

  const limitStr = searchParams.get('limit')
  const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 6, 1), 10) : 6

  // Optional context for better relevance scoring
  const originalTitle = searchParams.get('title') || undefined
  const yearStr = searchParams.get('year')
  const year = yearStr ? parseInt(yearStr, 10) || undefined : undefined

  try {
    const items = await getRelatedMovieNews({
      query: query.trim(),
      context: {
        title: query.trim(),
        originalTitle,
        year,
      },
      limit,
    })

    return NextResponse.json(
      {
        items,
        total: items.length,
        source: 'gnews',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=2700, stale-while-revalidate=5400',
        },
      },
    )
  } catch {
    return NextResponse.json({
      items: [],
      total: 0,
      source: 'gnews',
      fetchedAt: new Date().toISOString(),
    })
  }
}
