// ============================================
// POST /api/admin/sync/ophim/catalog — Trigger OPhim Catalog Sync
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { syncCatalog } from '@/src/be/modules/ophim/ophim-sync-service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-ophim-catalog' })

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!isUser(guard)) return guard

  try {
    const body = await req.json().catch(() => ({}))
    const pages = Math.min(Math.max(parseInt(body.pages || '1', 10), 1), 20)
    const startPage = Math.max(parseInt(body.startPage || '1', 10), 1)
    const delay = Math.min(Math.max(parseInt(body.delay || '500', 10), 100), 5000)

    // syncCatalog(startPage, endPage, delayMs)
    const endPage = startPage + pages - 1
    const { jobId, results } = await syncCatalog(startPage, endPage, delay)

    const synced = results.filter(r => r.action !== 'fail').length
    const failed = results.filter(r => r.action === 'fail').length

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        synced,
        failed,
        total: results.length,
        message: `Synced ${synced}/${results.length} movies from OPhim catalog (pages ${startPage}-${endPage})`,
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'OPhim catalog sync error')
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 })
  }
}
