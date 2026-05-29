// ============================================
// GET /api/v1/search/suggest — Autocomplete
// ============================================
// Query params:
//   q (required), limit (default 8, max 15)

import { NextRequest } from 'next/server'
import { suggestMovies } from '@/src/be/modules/search/movie-search-service'
import { parseIntParam, jsonError } from '@/src/be/modules/movies/api-helpers'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'search-suggest' })

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const query = sp.get('q')?.trim()
    if (!query || query.length < 1) {
      return Response.json({ success: true, data: [], meta: { source: 'none' } })
    }

    const limit = parseIntParam(sp.get('limit'), 8, 1, 15)

    const { items, source } = await suggestMovies(query, limit)

    return Response.json({
      success: true,
      data: items,
      meta: { query, source },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/search/suggest error')
    return jsonError('Internal Server Error', 500)
  }
}
