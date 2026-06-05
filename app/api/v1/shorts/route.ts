import { NextRequest } from 'next/server'
import { getShorts } from '@/src/be/modules/movies/shorts.service'
import { apiSuccess, apiError } from '@/src/be/shared/api-response'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'shorts' })

// GET /api/v1/shorts?limit=20&skip=0 — vertical discovery feed
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10) || 20, 50)
    const skip = Math.max(parseInt(sp.get('skip') || '0', 10) || 0, 0)

    const items = await getShorts(limit, skip)
    // apiSuccess/apiError already return a NextResponse — return directly.
    return apiSuccess(items)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/shorts GET error')
    return apiError('Internal Server Error', 500)
  }
}
