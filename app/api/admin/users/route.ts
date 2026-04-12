import { NextRequest } from 'next/server'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { userCreateSchema } from '@/src/be/modules/admin/validators'
import { AuthService } from '@/src/be/modules/auth'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { canChangeRole } from '@/src/be/modules/auth/permissions'
import { UsersService } from '@/src/be/modules/users/users.service'

// GET /api/admin/users — list with full search/filter/sort
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('users.view')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePagination(sp)
  const search = sp.get('search') || ''
  const role = sp.get('role') || ''
  const status = sp.get('status') || ''
  const deleted = sp.get('deleted')
  const sortBy = sp.get('sortBy') || 'newest'

  const [data, total] = await UsersService.getPaginatedUsers(search, role, status, deleted, sortBy, skip, limit)

  return paginatedResponse(data, total, page, limit)
}

// POST /api/admin/users — create user
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('users.create')
  if (auth instanceof Response) return auth

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  // Check role assignment permission
  if (parsed.data.role !== 'USER' && !canChangeRole(auth.user as any, 'USER', parsed.data.role as any)) {
    return errorResponse('Bạn không có quyền tạo user với role này', 403)
  }

  const existing = await UsersService.getUserByEmail(parsed.data.email.toLowerCase())
  if (existing) return errorResponse('Email đã được sử dụng', 409)

  const passwordHash = await AuthService.hashPassword(parsed.data.password)
  const user = await UsersService.createUser({
    name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash, role: parsed.data.role.toUpperCase() as any
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'user', targetId: user.id,
    metadata: { name: user.name, role: user.role }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ id: user.id, name: user.name, email: user.email, role: user.role }, 201)
}
