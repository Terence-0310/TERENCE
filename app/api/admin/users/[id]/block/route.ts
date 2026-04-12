import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/block
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.block')
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody<{ reason?: string }>(req)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  if (user.email === auth.user.email) {
    return errorResponse('Không thể khóa chính tài khoản đang đăng nhập')
  }

  if (user.role === 'SUPER_ADMIN' && auth.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
    return errorResponse('Không có quyền khóa Super Admin', 403)
  }

  if (user.status === 'banned') {
    return errorResponse('Tài khoản đã bị khóa')
  }

  await prisma.user.update({
    where: { id },
    data: { status: 'banned', isActive: false, blockedReason: body?.reason || null },
  })

  // Invalidate sessions
  await prisma.session.deleteMany({ where: { userId: id } })

  await logAdminAction({
    actorId: auth.user.email, action: 'block', targetType: 'user', targetId: id,
    metadata: { email: user.email, reason: body?.reason }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã khóa tài khoản' })
}
