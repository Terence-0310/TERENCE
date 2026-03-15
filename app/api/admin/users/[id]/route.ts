import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { userUpdateSchema } from '@/lib/admin/validators'
import { hashPassword } from '@/lib/auth/password'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'
import { canChangeRole } from '@/lib/auth/permissions'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.view')
  if (auth instanceof Response) return auth
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      isActive: true, avatar: true, lastLoginAt: true, lastLoginIp: true,
      loginCount: true, blockedReason: true, createdAt: true, updatedAt: true,
      deletedAt: true,
    },
  })
  if (!user) return errorResponse('User not found', 404)
  return successResponse(user)
}

// PATCH /api/admin/users/[id] — update user info
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return errorResponse('Invalid request body')

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  // Prevent self-demotion/blocking
  if (user.email === auth.user.email) {
    if (body.status === 'banned' || body.status === 'suspended' || body.isActive === false) {
      return errorResponse('Không thể khóa/tạm ngưng chính tài khoản đang đăng nhập')
    }
    if (body.role && body.role !== auth.user.role) {
      return errorResponse('Không thể tự thay đổi role của mình')
    }
  }

  // Prevent admin from editing super_admin
  if (user.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Không có quyền chỉnh sửa Super Admin', 403)
  }

  // Handle role change permission
  if (body.role && typeof body.role === 'string' && body.role !== user.role) {
    if (!canChangeRole(auth.user, user.role, body.role)) {
      return errorResponse('Bạn không có quyền đổi role này', 403)
    }
  }

  // Handle password reset inline
  const updateData: Record<string, unknown> = {}
  if (body.password && typeof body.password === 'string' && body.password.length >= 8) {
    updateData.passwordHash = await hashPassword(body.password)
    delete body.password
  }

  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  // Sync isActive with status
  if (parsed.data.status === 'banned' || parsed.data.status === 'suspended') {
    updateData.isActive = false
  } else if (parsed.data.status === 'active') {
    updateData.isActive = true
    updateData.blockedReason = null
  }

  const updated = await prisma.user.update({ where: { id }, data: { ...parsed.data, ...updateData } })

  // Determine action type for logging
  const action = parsed.data.status === 'banned' ? 'block' :
    parsed.data.status === 'suspended' ? 'suspend' :
    parsed.data.status === 'active' && (user.status === 'banned' || user.status === 'suspended') ? 'unblock' :
    parsed.data.role && parsed.data.role !== user.role ? 'change_role' :
    updateData.passwordHash ? 'reset_password' : 'update'

  await logAdminAction({
    actorId: auth.user.email, action, targetType: 'user', targetId: id,
    metadata: { email: user.email, changes: Object.keys({ ...parsed.data, ...updateData }) },
    ipAddress: getClientIp(req.headers),
  })

  return successResponse({
    id: updated.id, name: updated.name, email: updated.email,
    role: updated.role, status: updated.status,
  })
}

// Also keep PUT as alias for PATCH for backward compat
export { PATCH as PUT }

// DELETE /api/admin/users/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.delete')
  if (auth instanceof Response) return auth
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  if (user.email === auth.user.email) {
    return errorResponse('Không thể xóa chính tài khoản đang đăng nhập')
  }

  if (user.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Không có quyền xóa Super Admin', 403)
  }

  // Soft delete with deletedAt
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })

  // Invalidate sessions
  await prisma.session.deleteMany({ where: { userId: id } })

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'user', targetId: id,
    metadata: { email: user.email, name: user.name }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true })
}
