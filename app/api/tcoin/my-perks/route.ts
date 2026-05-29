// ============================================
// GET /api/tcoin/my-perks — lightweight perk flags for the current user
// ============================================
// Used by the header (and other client chrome) to render the avatar frame /
// exclusive badge without pulling the full wallet overview.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActivePerks } from '@/src/be/modules/tcoin/tcoin.service'
import { ok } from '@/src/be/shared/api-handler'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const empty = {
    frameActive: false,
    badgeActive: false,
    roomThemeActive: false,
    removeAdsActive: false,
    hdUpgradeActive: false,
    earlyAccessActive: false,
    // Map of optionId → activeUntil ISO (or null = forever).
    // Lets the TCoin page show "Đang sử dụng tới <date>" per card.
    activeByOption: {} as Record<string, string | null>,
  }
  if (!userId) return ok(empty)

  const perks = await getActivePerks(userId)
  const activeByOption: Record<string, string | null> = {}
  if (perks.avatarFrame) activeByOption['avatar-frame'] = perks.avatarFrame.activeUntil
  if (perks.exclusiveBadge) activeByOption['exclusive-badge'] = perks.exclusiveBadge.activeUntil
  if (perks.roomTheme) activeByOption['room-theme'] = perks.roomTheme.activeUntil
  if (perks.removeAds) activeByOption['remove-ads-7d'] = perks.removeAds.activeUntil
  if (perks.hdUpgrade) activeByOption['hd-upgrade'] = perks.hdUpgrade.activeUntil
  if (perks.earlyAccess) activeByOption['early-access'] = perks.earlyAccess.activeUntil

  return ok({
    frameActive: !!perks.avatarFrame,
    badgeActive: !!perks.exclusiveBadge,
    roomThemeActive: !!perks.roomTheme,
    removeAdsActive: !!perks.removeAds,
    hdUpgradeActive: !!perks.hdUpgrade,
    earlyAccessActive: !!perks.earlyAccess,
    activeByOption,
  })
}
