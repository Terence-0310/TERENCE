// ============================================
// GET /api/v1/home — Home Page Data
// ============================================

import { NextRequest } from 'next/server'
import { getHomeData } from '@/src/server/movies/movie-service'
import { serializeMovieCard } from '@/src/server/movies/serializers'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function GET(_req: NextRequest) {
  try {
    const data = await getHomeData()

    return apiSuccess({
      featured: data.featured.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
      latest: data.latest.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
      trending: data.trending.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
      movies: data.movies.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
      series: data.series.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
      anime: data.anime.map(m => serializeMovieCard(m as unknown as Record<string, unknown>)),
    })
  } catch (error) {
    console.error('[API] /v1/home error:', error)
    return apiError('Internal Server Error', 500)
  }
}
