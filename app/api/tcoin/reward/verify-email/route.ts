// ============================================
// POST /api/tcoin/reward/verify-email
// ============================================
// Claim the one-time +20 TCoin for having a verified email address. Idempotent
// (the underlying service refuses to credit twice). Needed for users who
// signed in via Google OAuth — their email is verified at signup but the
// regular email-token flow that auto-credits the reward never runs.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rewardVerifyEmail } from '@/src/be/modules/tcoin/tcoin.service'
import { ok, unauthorized, badRequest } from '@/src/be/shared/api-handler'
import { prisma } from '@/src/be/shared/db/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEmailVerified: true },
  })
  if (!user) return unauthorized()
  if (!user.isEmailVerified) {
    return badRequest('Email chưa được xác minh. Hãy gửi mail xác minh trước.')
  }

  const result = await rewardVerifyEmail(userId)
  if (!result.ok) {
    return ok({ alreadyClaimed: true, amount: 0, message: 'Bạn đã nhận thưởng này rồi.' })
  }
  return ok({ alreadyClaimed: false, amount: result.amount, message: `+${result.amount} TCoin!` })
}
