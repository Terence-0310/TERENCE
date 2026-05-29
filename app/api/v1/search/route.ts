// ============================================
// GET /api/v1/search — Full-text Movie Search
// ============================================
// Query params:
//   q (required), page, perPage (alias: limit), type, year, category, country
//
// Response shape:
//   { success, data: { items, pagination, suggestions }, meta }
// `items` is the primary hit list. `suggestions` is a small "did you mean"
// slice drawn from the autocomplete index — useful when the top match is
// unambiguous but the user might also be looking for a similar title.

import { NextRequest } from 'next/server'
import { searchMovies } from '@/src/be/modules/search/movie-search-service'
import { parseIntParam, parseStringParam, jsonError } from '@/src/be/modules/movies/api-helpers'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'search' })

const ALLOWED_TYPES = ['movie', 'series', 'anime']

// Rate limit: 20 search requests per minute per IP
const searchLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 })

export async function GET(req: NextRequest) {
  try {
    // Rate limit check
    const clientId = getClientIdentifier(req)
    const limitResult = await searchLimiter.check(clientId)
    if (!limitResult.allowed) {
      return jsonError('Quá nhiều yêu cầu tìm kiếm, vui lòng thử lại sau', 429)
    }

    const sp = req.nextUrl.searchParams

    const query = sp.get('q')?.trim()
    if (!query || query.length < 1) {
      return jsonError('Missing required query parameter: q', 400)
    }

    const page = parseIntParam(sp.get('page'), 1, 1, 100)
    // Accept both `perPage` (legacy) and `limit` (spec) — same thing.
    const perPage = parseIntParam(sp.get('perPage') ?? sp.get('limit'), 20, 1, 50)
    const contentType = parseStringParam(sp.get('type'), ALLOWED_TYPES)
    const year = sp.get('year') ? parseIntParam(sp.get('year'), 0, 1900, 2100) || undefined : undefined
    const category = parseStringParam(sp.get('category'))
    const country = parseStringParam(sp.get('country'))

    const result = await searchMovies(query, page, perPage, { contentType, year, category, country })

    return Response.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          // Field aliased on the wire — both names appear so legacy
          // consumers (perPage) and spec'd consumers (limit) work.
          limit: result.perPage,
          perPage: result.perPage,
          total: result.total,
          totalPages: result.totalPages,
        },
        suggestions: result.suggestions,
        // Hint surfaces "looks like a name + no actor match" so /browse
        // can render the explanatory banner. Only present on page 1.
        hint: result.hint,
      },
      meta: {
        query,
        source: result.source,
        filters: { contentType, year, category, country },
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/search error')
    return jsonError('Internal Server Error', 500)
  }
}
