// ============================================
// GET /api/v1/movies — Movie List (paginated + filtered)
// ============================================
// Query params:
//   page (default 1), perPage (default 24, max 100)
//   category (slug), country (slug), year (int)
//   type (movie|series|anime), featured (bool), trending (bool)
//   sort (newest|oldest|popular|rating|year|title)

import { NextRequest } from 'next/server'
import { getMovieList, type MovieListParams } from '@/src/be/modules/movies/movie-service'
import { serializeMovieCard, serializePagination } from '@/src/be/modules/movies/serializers'
import { parseIntParam, parseStringParam, parseBoolParam, jsonPaginated, jsonError } from '@/src/be/modules/movies/api-helpers'

const ALLOWED_TYPES = ['movie', 'series', 'anime']
const ALLOWED_SORTS = ['newest', 'oldest', 'popular', 'rating', 'year', 'title']

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const params: MovieListParams = {
      page: parseIntParam(sp.get('page'), 1, 1, 1000),
      perPage: parseIntParam(sp.get('perPage'), 24, 1, 100),
      category: parseStringParam(sp.get('category')),
      country: parseStringParam(sp.get('country')),
      year: sp.get('year') ? parseIntParam(sp.get('year'), 0, 1900, 2100) || undefined : undefined,
      contentType: parseStringParam(sp.get('type'), ALLOWED_TYPES),
      featured: parseBoolParam(sp.get('featured')),
      trending: parseBoolParam(sp.get('trending')),
      sort: (parseStringParam(sp.get('sort'), ALLOWED_SORTS) as MovieListParams['sort']) || 'newest',
    }

    const { movies, total, page, perPage } = await getMovieList(params)

    return jsonPaginated(
      movies.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      serializePagination(page, perPage, total),
    )
  } catch (error) {
    console.error('[API] /v1/movies error:', error)
    return jsonError('Internal Server Error', 500)
  }
}
