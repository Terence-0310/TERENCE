import { NextRequest } from 'next/server'
import { MoviesPublicController } from '@/src/be/modules/movies/movies.public.controller'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return MoviesPublicController.getDetail(req, { params })
}
