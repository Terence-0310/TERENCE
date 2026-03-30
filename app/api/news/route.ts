// ============================================
// API Route: GET /api/news
// ============================================
// Top entertainment news headlines.
// Response: ApiListResponse<NewsArticle>

import { NextRequest, NextResponse } from 'next/server'
import { getTopEntertainmentNews } from '@/lib/news/articles'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const country = searchParams.get('country') || 'vi'
  const lang = searchParams.get('lang') || 'vi'
  const limitStr = searchParams.get('limit')
  const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 10) : 10

  try {
    const items = await getTopEntertainmentNews({ country, lang, limit })

    return NextResponse.json(
      {
        items,
        total: items.length,
        source: 'gnews',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=2400',
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
