import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { userCreateSchema } from '@/lib/admin/validators'
import { hashPassword } from '@/lib/auth/password'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'
import { canChangeRole } from '@/lib/auth/permissions'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  // Soft delete filter
  if (deleted === 'true') {
    where.deletedAt = { not: null }
  } else if (deleted !== 'all') {
    where.deletedAt = null
  }

  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
  if (role) where.role = role
  if (status) where.status = status

  // Sort
  const orderByMap: Record<string, object> = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    lastLogin: { lastLoginAt: 'desc' },
    loginCount: { loginCount: 'desc' },
    name: { name: 'asc' },
  }
  const orderBy = orderByMap[sortBy] || orderByMap.newest

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: limit, orderBy,
      select: {
        id: true, name: true, email: true, role: true, status: true,
        isActive: true, avatar: true, lastLoginAt: true, lastLoginIp: true,
        loginCount: true, blockedReason: true, createdAt: true, updatedAt: true,
        deletedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

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
  if (parsed.data.role !== 'user' && !canChangeRole(auth.user, 'user', parsed.data.role)) {
    return errorResponse('Bạn không có quyền tạo user với role này', 403)
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (existing) return errorResponse('Email đã được sử dụng', 409)

  const passwordHash = await hashPassword(parsed.data.password)
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash, role: parsed.data.role },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'user', targetId: user.id,
    metadata: { name: user.name, role: user.role }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ id: user.id, name: user.name, email: user.email, role: user.role }, 201)
}
