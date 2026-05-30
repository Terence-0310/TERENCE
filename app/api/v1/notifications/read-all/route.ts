import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ok, unauthorized } from '@/src/be/shared/api-handler'
import { markAllNotificationsRead } from '@/src/be/modules/notifications/notifications.service'

export const dynamic = 'force-dynamic'

// POST /api/v1/notifications/read-all — mark all of the user's notifications read.
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauthorized()
  await markAllNotificationsRead(userId)
  return ok({ ok: true })
}
