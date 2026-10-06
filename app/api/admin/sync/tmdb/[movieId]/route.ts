// ============================================
// POST /api/admin/sync/tmdb/[movieId] — Enrich Single Movie with TMDB
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { enrichMovie } from '@/src/be/modules/tmdb/tmdb-enrichment-service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-tmdb-movieId' })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const guard = await requireAdmin('system.manage')
  if (!isUser(guard)) return guard

  try {
    const { movieId } = await params
    if (!movieId?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing movieId' }, { status: 400 })
    }

    const result = await enrichMovie(movieId)

    return NextResponse.json({
      success: result.action !== 'fail',
      data: result,
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'TMDB enrich error')
    return NextResponse.json({ success: false, error: 'Enrichment failed' }, { status: 500 })
  }
}
