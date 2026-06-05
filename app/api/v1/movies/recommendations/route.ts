import { NextRequest } from 'next/server'
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

    // 'guest' triggers the trending fallback inside the service.
    const userId = session?.user?.id || 'guest'
    const recommendations = await getRecommendationsForUser(userId, limit)
    const serialized = recommendations.map((m: any) => serializeMovieCard(m))

    // apiSuccess already returns a NextResponse — return it directly
    // (wrapping it in NextResponse.json double-encodes the body).
    return apiSuccess(serialized)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/movies/recommendations GET error')
    return apiError('Internal Server Error', 500)
  }
}
