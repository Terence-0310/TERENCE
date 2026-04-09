// ============================================
// Watch History Query Helpers
// ============================================
// Reusable where/include clause builders for watch history.

import { Prisma } from '@prisma/client'

export const watchHistoryScopes = {
  /**
   * History for a specific user
   */
  forUser(userId: string): Prisma.WatchHistoryWhereInput {
    return { userId }
  },

  /**
   * History for a specific movie
   */
  forMovie(movieId: string): Prisma.WatchHistoryWhereInput {
    return { movieId }
  },

  /**
   * Completed watches only
   */
  completed(): Prisma.WatchHistoryWhereInput {
    return { isCompleted: true }
  },

  /**
   * In-progress (not completed)
   */
  inProgress(): Prisma.WatchHistoryWhereInput {
    return { isCompleted: false }
  },

  /**
   * Recently watched (last N days)
   */
  recent(days: number = 7): Prisma.WatchHistoryWhereInput {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return {
      lastWatchedAt: { gte: since },
    }
  },
}

export const watchHistoryIncludes = {
  /**
   * Include movie and episode details
   */
  withDetails(): Prisma.WatchHistoryInclude {
    return {
      movie: {
        select: {
          id: true,
          title: true,
          slug: true,
          posterUrl: true,
          thumbUrl: true,
          contentType: true,
          year: true,
        },
      },
      episode: {
        select: {
          id: true,
          episodeName: true,
          episodeNumber: true,
        },
      },
    }
  },

  /**
   * Include full movie with categories
   */
  withFullMovie(): Prisma.WatchHistoryInclude {
    return {
      movie: {
        include: {

          countries: { include: { country: true } },
        },
      },
      episode: true,
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    }
  },
}

export const watchHistoryOrderBy = {
  recentFirst(): Prisma.WatchHistoryOrderByWithRelationInput {
    return { lastWatchedAt: 'desc' }
  },
  oldestFirst(): Prisma.WatchHistoryOrderByWithRelationInput {
    return { lastWatchedAt: 'asc' }
  },
}
