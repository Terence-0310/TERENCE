// ============================================
// POST /api/admin/sync/elastic/[movieId] — Index Single Movie in Elasticsearch
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { indexMovie } from '@/src/be/modules/search/movie-search-indexer'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-elastic-movieId' })

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

    const ok = await indexMovie(movieId)

    return NextResponse.json({
      success: ok,
      data: { movieId, indexed: ok },
      message: ok ? 'Movie indexed successfully' : 'Failed to index (ES unavailable or movie not found)',
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'ES index error')
    return NextResponse.json({ success: false, error: 'Indexing failed' }, { status: 500 })
  }
}
