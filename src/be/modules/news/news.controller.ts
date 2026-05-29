// ============================================
// News Module — Controller
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getTopEntertainmentNews,
  getNewsByCategory,
  getRelatedMovieNews,
  searchNewsByKeyword,
} from '@/src/be/modules/news/news.service'

const VALID_TYPES = ['all', 'trailer', 'review', 'breaking'] as const

export const NewsController = {
  /**
   * GET /api/news
   * Top entertainment news headlines.
   */
  async getTopNews(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const country = searchParams.get('country') || 'vi'
    const lang = searchParams.get('lang') || 'vi'
    const limitStr = searchParams.get('limit')
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 10) : 10

    try {
      const items = await getTopEntertainmentNews({ country, lang, limit })

      return NextResponse.json(
        { items, total: items.length, source: 'gnews', fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=2400' } },
      )
    } catch {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }
  },

  /**
   * GET /api/news/category
   * Get news by category (trailer, review).
   */
  async getNewsByCategory(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const type = searchParams.get('type') as 'trailer' | 'review'
    if (!type || !['trailer', 'review'].includes(type)) {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }

    try {
      const items = await getNewsByCategory(type)

      return NextResponse.json(
        { items, total: items.length, source: 'gnews', fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=1500, stale-while-revalidate=3000' } },
      )
    } catch {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }
  },

  /**
   * GET /api/news/related
   * Related news for a specific movie.
   */
  async getRelatedNews(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('q')
    if (!query || !query.trim()) {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }

    const limitStr = searchParams.get('limit')
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 6, 1), 10) : 6

    const originalTitle = searchParams.get('title') || undefined
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr, 10) || undefined : undefined

    try {
      const items = await getRelatedMovieNews({
        query: query.trim(),
        context: { title: query.trim(), originalTitle, year },
        limit,
      })

      return NextResponse.json(
        { items, total: items.length, source: 'gnews', fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=2700, stale-while-revalidate=5400' } },
      )
    } catch {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }
  },

  /**
   * GET /api/news/search
   * Search news by keyword with optional type filter.
   */
  async searchNews(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('q')
    if (!query || !query.trim()) {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }

    const type = (searchParams.get('type') || 'all') as typeof VALID_TYPES[number]
    const safeType = VALID_TYPES.includes(type) ? type : 'all'

    const limitStr = searchParams.get('limit')
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 10) : 10

    try {
      const items = await searchNewsByKeyword({ query: query.trim(), type: safeType, limit })

      return NextResponse.json(
        { items, total: items.length, source: 'gnews', fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
      )
    } catch {
      return NextResponse.json({ items: [], total: 0, source: 'gnews', fetchedAt: new Date().toISOString() })
    }
  },
}
