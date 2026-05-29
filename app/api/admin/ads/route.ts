// ============================================
// GET  /api/admin/ads — list + filter
// POST /api/admin/ads — create
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, errorResponse, successResponse, parseBody, getErrorMessage } from '@/src/be/modules/admin/api-helpers'
import { createAd, listAds, AD_TYPES, AD_PLACEMENTS } from '@/src/be/modules/ads/ads.service'
import type { AdType, AdPlacement, AdInput } from '@/src/be/modules/ads/ads.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const sp = req.nextUrl.searchParams
  const typeParam = sp.get('type')
  const placementParam = sp.get('placement')
  const activeParam = sp.get('isActive')

  const type = typeParam && (AD_TYPES as readonly string[]).includes(typeParam) ? (typeParam as AdType) : undefined
  const placement = placementParam && (AD_PLACEMENTS as readonly string[]).includes(placementParam)
    ? (placementParam as AdPlacement)
    : undefined

  const isActive = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined

  try {
    const result = await listAds({
      type,
      placement,
      isActive,
      search: sp.get('q') || undefined,
      page: parseInt(sp.get('page') || '1', 10),
      limit: parseInt(sp.get('limit') || '20', 10),
    })
    return successResponse(result)
  } catch (err) {
    return errorResponse(getErrorMessage(err), 500)
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const body = await parseBody<AdInput>(req)
  if (!body) return errorResponse('Invalid JSON body')

  try {
    const ad = await createAd(body)
    return successResponse(ad, 201)
  } catch (err) {
    return errorResponse(getErrorMessage(err), 400)
  }
}
