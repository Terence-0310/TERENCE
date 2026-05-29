import { NextRequest, NextResponse } from 'next/server'
import { getRecommendationsForUser } from '@/src/be/modules/movies/recommendation.service'
import { serializeMovieCard } from '@/src/be/modules/movies/serializers'
import { apiSuccess, apiError } from '@/src/be/shared/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'movies-recommendations' })

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const limitStr = req.nextUrl.searchParams.get('limit')
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 30) : 12

    const userId = session?.user?.id
    if (!userId) {
      // Trả về gợi ý cho Guest (Fallback trending)
      const recommendations = await getRecommendationsForUser('guest', limit)
      const serialized = recommendations.map((m: any) => serializeMovieCard(m))
      return NextResponse.json(apiSuccess(serialized))
    }

    const recommendations = await getRecommendationsForUser(userId, limit)
    const serialized = recommendations.map((m: any) => serializeMovieCard(m))

    return NextResponse.json(apiSuccess(serialized))
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/movies/recommendations GET error')
    return NextResponse.json(apiError('Internal Server Error', 500), { status: 500 })
  }
}
