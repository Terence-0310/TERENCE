// ============================================
// POST /api/admin/elastic/reindex — Full Elasticsearch Reindex
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/server/admin/admin-guard'
import { reindexAll } from '@/src/server/search/movie-search-indexer'
import { isAvailable } from '@/src/server/search/elastic-client'

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
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

    const stats = await reindexAll(batchSize)

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        message: `Reindexed ${stats.indexed}/${stats.total} movies (${stats.errors} errors)`,
      },
    })
  } catch (error) {
    console.error('[Admin] ES reindex error:', error)
    return NextResponse.json({ success: false, error: 'Reindex failed' }, { status: 500 })
  }
}
