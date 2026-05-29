// ============================================
// GET /api/ads/active?placement=PRE_ROLL
// ============================================
// Public endpoint the player polls right before playback. Returns
// either a single ad payload or null (no ad to show).
//
// We short-circuit to null when the caller holds the active
// `remove-ads-7d` perk — querying the ads table for a user who'll
// never see them is pure waste.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pickActiveAd, AD_PLACEMENTS, recordAdEvent } from '@/src/be/modules/ads/ads.service'
import type { AdPlacement } from '@/src/be/modules/ads/ads.service'
import { getActivePerks } from '@/src/be/modules/tcoin/tcoin.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const placementParam = req.nextUrl.searchParams.get('placement') || 'PRE_ROLL'
  if (!(AD_PLACEMENTS as readonly string[]).includes(placementParam)) {
    return NextResponse.json({ ad: null, error: 'Invalid placement' }, { status: 400 })
  }
  const placement = placementParam as AdPlacement

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  let userHasAdFree = false
  if (userId) {
    try {
      const perks = await getActivePerks(userId)
      // `removeAds` present → user redeemed the perk. Check expiry too;
      // `null` activeUntil means evergreen (e.g. lifetime upgrade), and
      // a future date means still in window.
      const perk = perks.removeAds
      if (perk) {
        userHasAdFree = !perk.activeUntil || new Date(perk.activeUntil).getTime() > Date.now()
      }
    } catch {
      // Don't fail the request for perk-check errors — fall through
      // and show an ad. Better to over-serve than to break playback.
    }
  }

  const ad = await pickActiveAd(placement, { userHasAdFree })
  if (!ad) {
    return NextResponse.json({ ad: null, adFree: userHasAdFree })
  }

  // Fire-and-forget impression so the player doesn't wait on it.
  void recordAdEvent(ad.id, 'impression', userId, placement)

  return NextResponse.json({
    ad: {
      id: ad.id,
      title: ad.title,
      type: ad.type,
      placement: ad.placement,
      duration: ad.duration,
      mediaUrl: ad.mediaUrl,
      targetUrl: ad.targetUrl,
      skipAfterSeconds: ad.skipAfterSeconds,
    },
    adFree: false,
  })
}
