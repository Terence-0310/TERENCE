import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ok, unauthorized } from '@/src/be/shared/api-handler'
import { listNotifications } from '@/src/be/modules/notifications/notifications.service'

export const dynamic = 'force-dynamic'

// GET /api/v1/notifications — current user's recent notifications + unread count.
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauthorized()
  return ok(await listNotifications(userId))
}
