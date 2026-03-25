// ============================================
// Sync Job & Log Query Helpers
// ============================================
// Reusable where/include clause builders for sync operations.

import { Prisma } from '@prisma/client'

export const syncJobScopes = {
  /**
   * Jobs that are currently running
   */
  running(): Prisma.SyncJobWhereInput {
    return { status: 'running' }
  },

  /**
   * Jobs that are pending (queued)
   */
  pending(): Prisma.SyncJobWhereInput {
    return { status: 'pending' }
  },

  /**
   * Jobs that have failed
   */
  failed(): Prisma.SyncJobWhereInput {
    return { status: 'failed' }
  },

  /**
   * Jobs by source
   */
  bySource(source: string): Prisma.SyncJobWhereInput {
    return { source }
  },

  /**
   * Recent jobs (last N hours)
   */
  recent(hours: number = 24): Prisma.SyncJobWhereInput {
    const since = new Date()
    since.setHours(since.getHours() - hours)
    return {
      createdAt: { gte: since },
    }
  },
}

export const syncJobIncludes = {
  /**
   * Include logs summary
   */
  withLogs(limit: number = 50): Prisma.SyncJobInclude {
    return {
      syncLogs: {
        orderBy: { createdAt: 'desc' },
        take: limit,
      },
    }
  },

  /**
   * Include only error logs
   */
  withErrors(): Prisma.SyncJobInclude {
    return {
      syncLogs: {
        where: { status: 'error' },
        orderBy: { createdAt: 'desc' },
      },
    }
  },
}

export const syncLogScopes = {
  /**
   * Logs for a specific movie
   */
  forMovie(movieId: string): Prisma.SyncLogWhereInput {
    return { movieId }
  },

  /**
   * Error logs only
   */
  errors(): Prisma.SyncLogWhereInput {
    return { status: 'error' }
  },

  /**
   * Logs from a specific source
   */
  bySource(source: string): Prisma.SyncLogWhereInput {
    return { source }
  },

  /**
   * Recent logs
   */
  recent(hours: number = 24): Prisma.SyncLogWhereInput {
    const since = new Date()
    since.setHours(since.getHours() - hours)
    return {
      createdAt: { gte: since },
    }
  },
}
