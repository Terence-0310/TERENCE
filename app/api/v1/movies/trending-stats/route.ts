import { NextRequest } from 'next/server'
import { MoviesPublicController } from '@/src/be/modules/movies/movies.public.controller'

export async function GET(req: NextRequest) {
  return MoviesPublicController.getTrendingStats(req)
}
