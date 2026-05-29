// ============================================
// GET /api/v1/home — Home Page Data
// ============================================

import { NextRequest } from 'next/server'
import { getHomeData } from '@/src/be/modules/movies/movie-service'
import { serializeMovieCard } from '@/src/be/modules/movies/serializers'
import { apiSuccess, apiError } from '@/src/be/shared/api-response'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'home' })

export async function GET(_req: NextRequest) {
  try {
    const data = await getHomeData()

    return apiSuccess({
      featured: data.featured.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      latest: data.latest.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      trending: data.trending.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      movies: data.movies.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      series: data.series.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
      anime: data.anime.map((m: any) => serializeMovieCard(m as unknown as Record<string, unknown>)),
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/home error')
    return apiError('Internal Server Error', 500)
  }
}
