// ============================================
// GET /api/admin/sync/logs — Sync Logs Viewer
// ============================================
// Query params: source, status, movieId, jobId, page, perPage

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-logs' })

export async function GET(req: NextRequest) {
  const guard = await requireAdmin('system.manage')
  if (!isUser(guard)) return guard

  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(parseInt(sp.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(sp.get('perPage') || '20', 10), 1), 100)
    const source = sp.get('source') || undefined
    const status = sp.get('status') || undefined
    const movieId = sp.get('movieId') || undefined
    const jobId = sp.get('jobId') || undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (source) where.source = source
    if (status) where.status = status
    if (movieId) where.movieId = movieId
    if (jobId) where.syncJobId = jobId

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        include: {
          movie: { select: { id: true, title: true, slug: true } },
          syncJob: { select: { id: true, source: true, jobType: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.syncLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        source: log.source,
        action: log.action,
        status: log.status,
        message: log.message,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        movie: log.movie ? { id: log.movie.id, title: log.movie.title, slug: log.movie.slug } : null,
        syncJob: log.syncJob ? { id: log.syncJob.id, source: log.syncJob.source, jobType: log.syncJob.jobType, status: log.syncJob.status } : null,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Sync logs error')
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 })
  }
}
