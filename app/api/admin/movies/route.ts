import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { movieCreateSchema, generateSlug } from '@/lib/admin/validators'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

// GET /api/admin/movies — list with full search/filter/sort
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('movies.view')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePagination(sp)
  const search = sp.get('search') || ''
  const status = sp.get('status') || ''
  const type = sp.get('type') || ''
  const featured = sp.get('featured')
  const trending = sp.get('trending')
  const recommended = sp.get('recommended')
  const hasPoster = sp.get('hasPoster')
  const hasSource = sp.get('hasSource')
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

  // Search across title, originalTitle, slug
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { originalTitle: { contains: search } },
      { slug: { contains: search } },
    ]
  }

  if (status) where.status = status
  if (type) where.contentType = type
  if (featured === 'true') where.isFeatured = true
  if (trending === 'true') where.isTrending = true
  if (recommended === 'true') where.isRecommended = true
  if (hasPoster === 'false') where.posterUrl = null
  if (hasPoster === 'true') where.posterUrl = { not: null }
  if (hasSource === 'false') where.sourceStatus = { in: ['missing', 'broken'] }
  if (hasSource === 'true') where.sourceStatus = 'active'

  // Sort
  const orderByMap: Record<string, object> = {
    newest: { createdAt: 'desc' },
    updated: { updatedAt: 'desc' },
    views: { viewCount: 'desc' },
    rating: { rating: 'desc' },
    year: { year: 'desc' },
    title: { title: 'asc' },
  }
  const orderBy = orderByMap[sortBy] || orderByMap.newest

  const [data, total] = await Promise.all([
    prisma.movie.findMany({
      where, skip, take: limit, orderBy,
      include: { _count: { select: { episodes: true } } },
    }),
    prisma.movie.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

// POST /api/admin/movies — create
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('movies.create')
  if (auth instanceof Response) return auth

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = movieCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const data = parsed.data
  if (!data.slug) data.slug = generateSlug(data.title)

  const existing = await prisma.movie.findUnique({ where: { slug: data.slug } })
  if (existing) return errorResponse('Slug đã tồn tại', 409)

  // Sync isPublished with status
  const isPublished = data.status === 'published'

  const movie = await prisma.movie.create({
    data: { ...data, isPublished, createdBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'movie', targetId: movie.id,
    metadata: { title: movie.title, type: movie.contentType }, ipAddress: getClientIp(req.headers),
  })

  return successResponse(movie, 201)
}
