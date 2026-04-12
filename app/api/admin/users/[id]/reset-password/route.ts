import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { AuthService } from '@/src/be/modules/auth'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/reset-password
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody<{ password: string }>(req)
  if (!body?.password || body.password.length < 8) {
    return errorResponse('Mật khẩu phải có ít nhất 8 ký tự')
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  // Prevent editing super_admin if not super_admin
  if (user.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Không có quyền reset password Super Admin', 403)
  }

  const passwordHash = await AuthService.hashPassword(body.password)
  await prisma.user.update({ where: { id }, data: { passwordHash } })

  // Invalidate sessions for security
  await prisma.session.deleteMany({ where: { userId: id } })

  await logAdminAction({
    actorId: auth.user.email, action: 'reset_password', targetType: 'user', targetId: id,
    metadata: { email: user.email }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã đặt lại mật khẩu' })
}
