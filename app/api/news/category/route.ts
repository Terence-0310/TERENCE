// ============================================
// API Route: GET /api/news/category
// ============================================
// Get news by category (trailer, review).
// Query: type (trailer|review)
// Response: ApiListResponse<NewsArticle>

import { NextRequest, NextResponse } from 'next/server'
import { getNewsByCategory } from '@/lib/news/articles'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type') as 'trailer' | 'review'
  if (!type || !['trailer', 'review'].includes(type)) {
    return NextResponse.json({
      items: [],
      total: 0,
      source: 'gnews',
      fetchedAt: new Date().toISOString(),
    })
  }

  try {
    const items = await getNewsByCategory(type)

    return NextResponse.json(
      {
        items,
        total: items.length,
        source: 'gnews',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1500, stale-while-revalidate=3000',
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
