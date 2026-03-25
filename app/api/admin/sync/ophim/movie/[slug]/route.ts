// ============================================
// POST /api/admin/sync/ophim/movie/[slug] — Sync Single OPhim Movie
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/server/admin/admin-guard'
import { syncMovieBySlug } from '@/src/server/ophim/ophim-sync-service'

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
    console.error('[Admin] OPhim movie sync error:', error)
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 })
  }
}
