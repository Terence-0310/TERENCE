import { NextRequest } from 'next/server'
import { requireAdmin, parseBody, successResponse, errorResponse } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { broadcastNotification } from '@/src/be/modules/notifications/notifications.service'

// POST /api/admin/notifications/broadcast — send a system notification to all users.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const body = await parseBody<{ title?: string; message?: string; link?: string }>(req)
  const title = body?.title?.trim()
  if (!title) return errorResponse('Tiêu đề không được để trống', 400)
  if (title.length > 160) return errorResponse('Tiêu đề tối đa 160 ký tự', 400)

  const { recipients } = await broadcastNotification({
    title,
    message: body?.message?.trim() || null,
    link: body?.link?.trim() || null,
  })

  await logAdminAction({
    actorId: auth.user.id,
    action: 'notification.broadcast',
    targetType: 'notification',
    metadata: { title, recipients },
    ipAddress: getClientIp(req.headers),
  }).catch(() => {})

  return successResponse({ ok: true, recipients })
}
