import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { userUpdateSchema } from '@/src/be/modules/admin/validators'
import { AuthService } from '@/src/be/modules/auth'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { canChangeRole } from '@/src/be/modules/auth/permissions'
import { UsersService } from '@/src/be/modules/users/users.service'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.view')
  if (auth instanceof Response) return auth
  const { id } = await params

  const user = await UsersService.getUserById(id)
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

  const user = await UsersService.getUserById(id)
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
  if (user.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Không có quyền chỉnh sửa Super Admin', 403)
  }

  // Handle role change permission
  if (body.role && typeof body.role === 'string' && body.role.toLowerCase() !== user.role?.toLowerCase()) {
    if (!canChangeRole(auth.user, (user.role as string)?.toLowerCase() as any, body.role.toLowerCase() as any)) {
      return errorResponse('Bạn không có quyền đổi role này', 403)
    }
  }

  // Handle password reset inline
  const updateData: Record<string, unknown> = {}
  if (body.password && typeof body.password === 'string' && body.password.length >= 8) {
    updateData.passwordHash = await AuthService.hashPassword(body.password)
    delete body.password
  }

  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  if (parsed.data.role) {
    (parsed.data as any).role = parsed.data.role.toUpperCase()
  }

  // Sync isActive with status
  if (parsed.data.status === 'banned' || parsed.data.status === 'suspended') {
    updateData.isActive = false
  } else if (parsed.data.status === 'active') {
    updateData.isActive = true
    updateData.blockedReason = null
  }

  const updated = await UsersService.updateUser(id, { ...parsed.data, ...updateData, role: parsed.data.role?.toUpperCase() as any })

  // Determine action type for logging
  const action = parsed.data.status === 'banned' ? 'block' :
    parsed.data.status === 'suspended' ? 'suspend' :
    parsed.data.status === 'active' && (user.status === 'banned' || user.status === 'suspended') ? 'unblock' :
    parsed.data.role && (parsed.data.role as string).toUpperCase() !== user.role ? 'change_role' :
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

  const user = await UsersService.getUserById(id)
  if (!user) return errorResponse('User not found', 404)

  if (user.email === auth.user.email) {
    return errorResponse('Không thể xóa chính tài khoản đang đăng nhập')
  }

  if (user.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Không có quyền xóa Super Admin', 403)
  }

  // Soft delete with deletedAt and invalidate sessions
  await UsersService.softDeleteUser(id)

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'user', targetId: id,
    metadata: { email: user.email, name: user.name }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true })
}
