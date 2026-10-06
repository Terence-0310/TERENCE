// ============================================
// GET /api/admin/sync/summary — Sync Health Summary
// ============================================
// Returns metadata health stats: missing trailers, unmatched TMDB, broken sources, recent failures.

import { NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-summary' })

export async function GET() {
  const guard = await requireAdmin('system.manage')
  if (!isUser(guard)) return guard

  try {
    const notDeleted = { deletedAt: null, isActive: true }
    const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const d24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      totalMovies,
      missingTrailer,
      missingTmdb,
      missingBackdrop,
      missingPoster,
      brokenSources,
      recentFailedJobs,
      recentSuccessJobs,
      recentPartialJobs,
      totalSyncJobs,
      moviesWithOphim,
      moviesWithTmdb,
      recentSyncLogs,
    ] = await Promise.all([
      prisma.movie.count({ where: notDeleted }),
      prisma.movie.count({ where: { ...notDeleted, trailerUrl: null } }),
      prisma.movie.count({ where: { ...notDeleted, tmdbId: null } }),
      prisma.movie.count({ where: { ...notDeleted, backdropUrl: null } }),
      prisma.movie.count({ where: { ...notDeleted, posterUrl: null } }),
      prisma.movieSource.count({ where: { isActive: false } }),
      prisma.syncJob.count({ where: { status: 'failed', createdAt: { gte: d7 } } }),
      prisma.syncJob.count({ where: { status: 'completed', createdAt: { gte: d7 } } }),
      prisma.syncJob.count({ where: { status: 'partial', createdAt: { gte: d7 } } }),
      prisma.syncJob.count(),
      prisma.movie.count({ where: { ...notDeleted, ophimId: { not: null } } }),
      prisma.movie.count({ where: { ...notDeleted, tmdbId: { not: null } } }),
      prisma.syncLog.count({ where: { status: 'error', createdAt: { gte: d24h } } }),
    ])

    // Recent sync jobs
    const recentJobs = await prisma.syncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, source: true, jobType: true, status: true,
        totalItems: true, processedItems: true, failedItems: true, skippedItems: true,
        startedAt: true, completedAt: true, createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        movies: {
          total: totalMovies,
          withOphim: moviesWithOphim,
          withTmdb: moviesWithTmdb,
          missingTrailer,
          missingTmdb,
          missingBackdrop,
          missingPoster,
          brokenSources,
        },
        sync: {
          totalJobs: totalSyncJobs,
          recentSuccessJobs7d: recentSuccessJobs,
          recentFailedJobs7d: recentFailedJobs,
          recentPartialJobs7d: recentPartialJobs,
          recentErrors24h: recentSyncLogs,
        },
        recentJobs: recentJobs.map(j => ({
          id: j.id,
          source: j.source,
          jobType: j.jobType,
          status: j.status,
          total: j.totalItems,
          processed: j.processedItems,
          failed: j.failedItems,
          skipped: j.skippedItems,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          createdAt: j.createdAt,
        })),
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Sync summary error')
    return NextResponse.json({ success: false, error: 'Failed to fetch summary' }, { status: 500 })
  }
}
