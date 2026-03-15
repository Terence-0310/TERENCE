import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse } from '@/lib/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('shorts.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const short = await prisma.short.findUnique({ where: { id } })
  if (!short) return errorResponse('Short not found', 404)

  await prisma.short.update({
    where: { id },
    data: { status: 'hidden', updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'hide', targetType: 'short', targetId: id,
    metadata: { title: short.title }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã ẩn short' })
}
