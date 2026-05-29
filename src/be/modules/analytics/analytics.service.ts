// ============================================
// Analytics Module — Service
// ============================================
// Real-time tracking engine for user analytics, page views, and movie trends.

import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'analytics-service' })

export interface TrackData {
  path: string
  movieId?: string | null
  shortId?: string | null
  userId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export class AnalyticsService {
  /**
   * Tracks a page view and increments movie/short view count if applicable.
   */
  static async trackPageView(data: TrackData) {
    // 1. Record the page view event
    const pageView = await prisma.pageView.create({
      data: {
        path: data.path,
        movieId: data.movieId,
        shortId: data.shortId,
        userId: data.userId,
        ip: data.ip,
        userAgent: data.userAgent?.substring(0, 500) // prevent db error for long strings
      }
    })

    // 2. Increment movie viewCount if a movieId is provided
    if (data.movieId) {
      // Fire & forget
      prisma.movie.updateMany({
        where: { id: data.movieId },
        data: {
          viewCount: {
            increment: 1
          }
        }
      }).catch((err: any) => {
        log.error({ movieId: data.movieId, err: err instanceof Error ? err.message : err }, 'Failed to increment viewCount for movie')
      })
    }
    
    // 3. Similarly for shorts if shortId is provided
    if (data.shortId) {
      // Feature reserved for when Short model is integrated into Prisma Schema.
    }

    return pageView
  }

  /**
   * Gets simple trending stats (e.g. today's total views)
   */
  static async getTrendingStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const viewsToday = await prisma.pageView.count({
      where: {
        createdAt: { gte: today }
      }
    })
    
    return {
      viewsToday
    }
  }
}
