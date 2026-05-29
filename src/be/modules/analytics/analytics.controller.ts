import { NextRequest } from 'next/server'
import { AnalyticsService } from './analytics.service'
import { AuthService } from '@/src/be/modules/auth'
import { ok, badRequest, serverError } from '@/src/be/shared/api-handler'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'analytics-controller' })

export class AnalyticsController {
  /**
   * POST /api/v1/analytics/track
   * Records a page view or event metric.
   */
  static async track(req: NextRequest) {
    try {
      let body: any
      try {
        body = await req.json()
      } catch {
        return badRequest('Invalid payload')
      }

      if (!body?.path) {
        return badRequest('Path is required')
      }

      const session = await AuthService.getSession()
      const userId = session?.user ? session.userId : null

      const ip = req.headers.get('x-forwarded-for') || null
      const userAgent = req.headers.get('user-agent') || null

      await AnalyticsService.trackPageView({
        path: body.path,
        movieId: body.movieId || null,
        shortId: body.shortId || null,
        userId: userId,
        ip: ip,
        userAgent: userAgent
      })

      return ok({ ok: true })
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'Analytics tracking error')
      return serverError('Failed to record tracking')
    }
  }
}
