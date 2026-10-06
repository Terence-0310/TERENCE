// ============================================
// POST /api/admin/elastic/reindex — Full Elasticsearch Reindex
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { reindexAll } from '@/src/be/modules/search/movie-search-indexer'
import { isAvailable } from '@/src/be/modules/search/elastic-client'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-elastic-reindex' })

export async function POST(req: NextRequest) {
  const guard = await requireAdmin('system.manage')
  if (!isUser(guard)) return guard

  try {
    const available = await isAvailable()
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'Elasticsearch is not available. Cannot reindex.',
      }, { status: 503 })
    }

    const body = await req.json().catch(() => ({}))
    const batchSize = Math.min(Math.max(parseInt(body.batchSize || '100', 10), 10), 500)

    // Tối ưu Background Job: Fire and forget (Chạy ngầm) thay vì block API request
    reindexAll(batchSize)
      .then(stats => log.info({ indexed: stats.indexed }, 'Reindex completed'))
      .catch(err => log.error({ err: err instanceof Error ? err.message : err }, 'ES reindex error'))

    return NextResponse.json({
      success: true,
      data: {
        message: 'Tiến trình đồng bộ Elasticsearch đang chạy ngầm (Background Job). Hãy kiểm tra log server.',
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'ES reindex error')
    return NextResponse.json({ success: false, error: 'Reindex failed' }, { status: 500 })
  }
}
