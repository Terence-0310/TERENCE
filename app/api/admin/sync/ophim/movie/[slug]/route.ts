// ============================================
// POST /api/admin/sync/ophim/movie/[slug] — Sync Single OPhim Movie
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { syncMovieBySlug } from '@/src/be/modules/ophim/ophim-sync-service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-sync-ophim-movie' })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = await requireAdmin()
  if (!isUser(guard)) return guard

  try {
    const { slug } = await params
    if (!slug?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
    }

    const result = await syncMovieBySlug(slug)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'OPhim movie sync error')
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 })
  }
}
