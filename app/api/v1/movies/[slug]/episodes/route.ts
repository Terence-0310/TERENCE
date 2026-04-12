// ============================================
// GET /api/v1/movies/[slug]/episodes — Episode List
// ============================================

import { NextRequest } from 'next/server'
import { getEpisodesByMovieSlug } from '@/src/be/modules/movies/movie-service'
import { serializeEpisode, groupEpisodesByServer } from '@/src/be/modules/movies/serializers'
import { jsonOk, jsonError } from '@/src/be/modules/movies/api-helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug || slug.trim() === '') {
      return jsonError('Missing slug parameter', 400)
    }

    const episodes = await getEpisodesByMovieSlug(slug)
    if (!episodes) {
      return jsonError('Movie not found', 404)
    }

    const serialized = episodes.map((e: any) => serializeEpisode(e as unknown as Record<string, unknown>))
    const grouped = groupEpisodesByServer(serialized)

    return jsonOk({
      total: serialized.length,
      servers: grouped,
    })
  } catch (error) {
    console.error('[API] /v1/movies/[slug]/episodes error:', error)
    return jsonError('Internal Server Error', 500)
  }
}
