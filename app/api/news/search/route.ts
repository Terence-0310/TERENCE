// ============================================
// API Route: GET /api/news/search
// ============================================
// Search news by keyword with optional type filter.
// Query: q (required), type (all|trailer|review|breaking), limit
// Response: ApiListResponse<NewsArticle>

import { NextRequest, NextResponse } from 'next/server'
import { searchNewsByKeyword } from '@/src/be/modules/news/articles'

const VALID_TYPES = ['all', 'trailer', 'review', 'breaking'] as const

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

  const type = (searchParams.get('type') || 'all') as typeof VALID_TYPES[number]
  const safeType = VALID_TYPES.includes(type) ? type : 'all'

  const limitStr = searchParams.get('limit')
  const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 10) : 10

  try {
    const items = await searchNewsByKeyword({
      query: query.trim(),
      type: safeType,
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
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
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
