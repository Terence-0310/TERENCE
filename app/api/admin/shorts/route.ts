import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { shortCreateSchema, generateSlug } from '@/lib/admin/validators'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

// GET /api/admin/shorts — list with search/filter/sort
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('shorts.view')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePagination(sp)
  const search = sp.get('search') || ''
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

  if (search) where.OR = [{ title: { contains: search } }, { slug: { contains: search } }, { hashtags: { contains: search } }]
  if (status) where.status = status

  // Sort
  const orderByMap: Record<string, object> = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    views: { viewCount: 'desc' },
    likes: { likeCount: 'desc' },
    title: { title: 'asc' },
  }
  const orderBy = orderByMap[sortBy] || orderByMap.newest

  const [data, total] = await Promise.all([
    prisma.short.findMany({
      where, skip, take: limit, orderBy,
      include: { movie: { select: { id: true, title: true } } },
    }),
    prisma.short.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

// POST /api/admin/shorts — create short
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('shorts.create')
  if (auth instanceof Response) return auth

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = shortCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  // Generate slug if empty
  if (!parsed.data.slug) {
    parsed.data.slug = generateSlug(parsed.data.title)
  }

  const existing = await prisma.short.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) return errorResponse('Slug đã tồn tại', 409)

  const short = await prisma.short.create({
    data: { ...parsed.data, createdBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'short', targetId: short.id,
    metadata: { title: short.title, slug: short.slug }, ipAddress: getClientIp(req.headers),
  })

  return successResponse(short, 201)
}
