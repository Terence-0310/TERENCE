// ============================================
// GET /api/v1/movies/[slug] — Movie Detail
// ============================================

import { NextRequest } from 'next/server'
import { getMovieBySlug } from '@/src/server/movies/movie-service'
import { serializeMovieDetail } from '@/src/server/movies/serializers'
import { jsonOk, jsonError } from '@/src/server/movies/api-helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug || slug.trim() === '') {
      return jsonError('Missing slug parameter', 400)
    }

    const movie = await getMovieBySlug(slug)
    if (!movie) {
      return jsonError('Movie not found', 404)
    }

    return jsonOk(serializeMovieDetail(movie as unknown as Record<string, unknown>))
  } catch (error) {
    console.error('[API] /v1/movies/[slug] error:', error)
    return jsonError('Internal Server Error', 500)
  }
}
