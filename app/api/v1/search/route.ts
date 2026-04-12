// ============================================
// GET /api/v1/search — Full-text Movie Search
// ============================================
// Query params:
//   q (required), page, perPage, type, year, category, country

import { NextRequest } from 'next/server'
import { searchMovies } from '@/src/be/modules/search/movie-search-service'
import { parseIntParam, parseStringParam, jsonError } from '@/src/be/modules/movies/api-helpers'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'

const ALLOWED_TYPES = ['movie', 'series', 'anime']

// Rate limit: 20 search requests per minute per IP
const searchLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 })

export async function GET(req: NextRequest) {
  try {
    // Rate limit check
    const clientId = getClientIdentifier(req)
    const limitResult = searchLimiter.check(clientId)
    if (!limitResult.allowed) {
      return jsonError('Quá nhiều yêu cầu tìm kiếm, vui lòng thử lại sau', 429)
    }

    const sp = req.nextUrl.searchParams

    const query = sp.get('q')?.trim()
    if (!query || query.length < 1) {
      return jsonError('Missing required query parameter: q', 400)
    }

    const page = parseIntParam(sp.get('page'), 1, 1, 100)
    const perPage = parseIntParam(sp.get('perPage'), 20, 1, 50)
    const contentType = parseStringParam(sp.get('type'), ALLOWED_TYPES)
    const year = sp.get('year') ? parseIntParam(sp.get('year'), 0, 1900, 2100) || undefined : undefined
    const category = parseStringParam(sp.get('category'))
    const country = parseStringParam(sp.get('country'))

    const result = await searchMovies(query, page, perPage, { contentType, year, category, country })

    return Response.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
      },
      meta: {
        query,
        source: result.source,
        filters: { contentType, year, category, country },
      },
    })
  } catch (error) {
    console.error('[API] /v1/search error:', error)
    return jsonError('Internal Server Error', 500)
  }
}
