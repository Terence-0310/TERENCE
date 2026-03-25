// ============================================
// POST /api/admin/sync/tmdb/[movieId] — Enrich Single Movie with TMDB
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/server/admin/admin-guard'
import { enrichMovie } from '@/src/server/tmdb/tmdb-enrichment-service'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const guard = await requireAdmin()
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
    console.error('[Admin] TMDB enrich error:', error)
    return NextResponse.json({ success: false, error: 'Enrichment failed' }, { status: 500 })
  }
}
