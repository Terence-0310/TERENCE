// ============================================
// GET    /api/admin/ads/[id]
// PATCH  /api/admin/ads/[id]
// DELETE /api/admin/ads/[id]
// POST   /api/admin/ads/[id]/toggle (handled below as PATCH ?op=toggle)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, errorResponse, successResponse, parseBody, getErrorMessage } from '@/src/be/modules/admin/api-helpers'
import { getAdById, updateAd, deleteAd, toggleAdActive } from '@/src/be/modules/ads/ads.service'
import type { AdInput } from '@/src/be/modules/ads/ads.service'

export const dynamic = 'force-dynamic'

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin('ads.manage')
  if (guard instanceof NextResponse) return guard
  const { id } = await ctx.params
  const ad = await getAdById(id)
  if (!ad) return errorResponse('Không tìm thấy', 404)
  return successResponse(ad)
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin('ads.manage')
  if (guard instanceof NextResponse) return guard
  const { id } = await ctx.params

  const op = req.nextUrl.searchParams.get('op')
  try {
    if (op === 'toggle') {
      const ad = await toggleAdActive(id)
      return successResponse(ad)
    }
    const body = await parseBody<Partial<AdInput>>(req)
    if (!body) return errorResponse('Invalid JSON body')
    const ad = await updateAd(id, body)
    return successResponse(ad)
  } catch (err) {
    return errorResponse(getErrorMessage(err), 400)
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin('ads.manage')
  if (guard instanceof NextResponse) return guard
  const { id } = await ctx.params
  try {
    await deleteAd(id)
    return successResponse({ ok: true })
  } catch (err) {
    return errorResponse(getErrorMessage(err), 400)
  }
}
