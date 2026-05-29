import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, parsePagination } from '@/src/be/modules/admin/api-helpers'
import { userCreateSchema, userUpdateSchema } from '@/src/be/modules/admin/validators'
import { AuthService } from '@/src/be/modules/auth'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { canChangeRole } from '@/src/be/modules/auth/permissions'
import { UsersService } from '@/src/be/modules/users/users.service'
import { ok, badRequest, forbidden, notFound, conflict, parseAndValidate } from '@/src/be/shared/api-handler'
import { Container } from '@/src/be/shared/di'
import type { Role } from '@prisma/client'

export class UsersController {
  // GET /api/admin/users — list with full search/filter/sort
  static async getPaginated(req: NextRequest) {
    const auth = await requireAdmin('users.view')
    if (auth instanceof Response) return auth

    const sp = req.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(sp)
    const search = sp.get('search') || ''
    const role = sp.get('role') || ''
    const status = sp.get('status') || ''
    const deleted = sp.get('deleted')
    const sortBy = sp.get('sortBy') || 'newest'

    const usersService = Container.resolve<UsersService>('UsersService')
    const [data, total] = await usersService.getPaginatedUsers(search, role, status, deleted, sortBy, skip, limit)

    // Get cached global stats
    const [globalTotal, globalActive, globalAdmins, globalBanned] = await usersService.getGlobalStats()

    const totalPages = Math.ceil(total / limit)
    
    return ok({
      data,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      globalStats: {
        total: globalTotal,
        active: globalActive,
        admins: globalAdmins,
        banned: globalBanned
      }
    })
  }

  // POST /api/admin/users — create user
  static async create(req: NextRequest) {
    const auth = await requireAdmin('users.create')
    if (auth instanceof Response) return auth

    const validation = await parseAndValidate(req, userCreateSchema)
    if (validation.error) return validation.error
    const { data: parsedData } = validation

    // Check role assignment permission
    if (parsedData.role && parsedData.role !== 'USER' && !canChangeRole(auth.user, 'USER', parsedData.role)) {
      return forbidden('Bạn không có quyền tạo user với role này')
    }

    const usersService = Container.resolve<UsersService>('UsersService')
    const existing = await usersService.getUserByEmail(parsedData.email.toLowerCase())
    if (existing) return conflict('Email đã được sử dụng')

    const passwordHash = await AuthService.hashPassword(parsedData.password)
    const roleVal = (parsedData.role || 'USER').toUpperCase() as Role
    const user = await usersService.createUser({
      name: parsedData.name, email: parsedData.email.toLowerCase(), passwordHash, role: roleVal
    })

    await logAdminAction({
      actorId: auth.user.email, action: 'create', targetType: 'user', targetId: user.id,
      metadata: { name: user.name, role: user.role }, ipAddress: getClientIp(req.headers),
    })

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role })
  }

  // GET /api/admin/users/[id]
  static async getById(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin('users.view')
    if (auth instanceof Response) return auth
    const { id } = await params

    const usersService = Container.resolve<UsersService>('UsersService')
    const user = await usersService.getUserById(id)
    if (!user) return notFound('User not found')
    return ok(user)
  }

  // PATCH /api/admin/users/[id] — update user info
  static async update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin('users.edit')
    if (auth instanceof Response) return auth
    const { id } = await params

    const validation = await parseAndValidate(req, userUpdateSchema.extend({ password: userCreateSchema.shape.password.optional() }))
    if (validation.error) return validation.error
    const body = validation.data

    const usersService = Container.resolve<UsersService>('UsersService')
    const user = await usersService.getUserById(id)
    if (!user) return notFound('User not found')

    // Prevent self-demotion/blocking
    if (user.email === auth.user.email) {
      if (body.status === 'banned' || body.status === 'suspended' || body.isActive === false) {
        return badRequest('Không thể khóa/tạm ngưng chính tài khoản đang đăng nhập')
      }
      if (body.role && body.role !== auth.user.role) {
        return badRequest('Không thể tự thay đổi role của mình')
      }
    }

    // Prevent admin from editing super_admin
    if (user.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
      return forbidden('Không có quyền chỉnh sửa Super Admin')
    }

    // Handle role change permission
    if (body.role && typeof body.role === 'string' && body.role.toLowerCase() !== user.role?.toLowerCase()) {
      if (!canChangeRole(auth.user, (user.role as string)?.toLowerCase(), body.role.toLowerCase())) {
        return forbidden('Bạn không có quyền đổi role này')
      }
    }

    // Handle password reset inline
    const updateData: Record<string, unknown> = {}
    if (body.password) {
      updateData.passwordHash = await AuthService.hashPassword(body.password)
      delete body.password
    }

    if (body.role) {
      body.role = body.role.toUpperCase() as typeof body.role
    }

    // Sync isActive with status
    if (body.status === 'banned' || body.status === 'suspended') {
      updateData.isActive = false
    } else if (body.status === 'active') {
      updateData.isActive = true
      updateData.blockedReason = null
    }

    if (body.status === 'banned') {
      await prisma.session.deleteMany({ where: { userId: id } })
    }

    const updated = await usersService.updateUser(id, { ...body, ...updateData, role: body.role?.toUpperCase() as Role | undefined })

    // Determine action type for logging
    const action = body.status === 'banned' ? 'block' :
      body.status === 'suspended' ? 'suspend' :
      body.status === 'active' && (user.status === 'banned' || user.status === 'suspended') ? 'unblock' :
      body.role && (body.role as string).toUpperCase() !== user.role ? 'change_role' :
      updateData.passwordHash ? 'reset_password' : 'update'

    await logAdminAction({
      actorId: auth.user.email, action, targetType: 'user', targetId: id,
      metadata: { email: user.email, changes: Object.keys({ ...body, ...updateData }) },
      ipAddress: getClientIp(req.headers),
    })

    return ok({
      id: updated.id, name: updated.name, email: updated.email,
      role: updated.role, status: updated.status,
    })
  }

  // DELETE /api/admin/users/[id] — soft delete
  static async delete(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin('users.delete')
    if (auth instanceof Response) return auth
    const { id } = await params

    const usersService = Container.resolve<UsersService>('UsersService')
    const user = await usersService.getUserById(id)
    if (!user) return notFound('User not found')

    if (user.email === auth.user.email) {
      return badRequest('Không thể xóa chính tài khoản đang đăng nhập')
    }

    if (user.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
      return forbidden('Không có quyền xóa Super Admin')
    }

    // Soft delete with deletedAt and invalidate sessions
    await usersService.softDeleteUser(id)

    await logAdminAction({
      actorId: auth.user.email, action: 'delete', targetType: 'user', targetId: id,
      metadata: { email: user.email, name: user.name }, ipAddress: getClientIp(req.headers),
    })

    return ok({ ok: true })
  }
}
