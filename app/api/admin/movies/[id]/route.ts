import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { movieUpdateSchema } from '@/lib/admin/validators'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/movies/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.view')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: { episodes: { orderBy: { sortOrder: 'asc' } }, shorts: true },
  })
  if (!movie) return errorResponse('Movie not found', 404)

  return successResponse(movie)
}

// PUT /api/admin/movies/[id] — update
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = movieUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return errorResponse('Movie not found', 404)

  // Check slug uniqueness if changed
  if (parsed.data.slug && parsed.data.slug !== movie.slug) {
    const dup = await prisma.movie.findUnique({ where: { slug: parsed.data.slug } })
    if (dup) return errorResponse('Slug đã tồn tại', 409)
  }

  // Sync isPublished with status
  const updateData: Record<string, unknown> = { ...parsed.data, updatedBy: auth.user.email }
  if (parsed.data.status) {
    updateData.isPublished = parsed.data.status === 'published'
  }

  const updated = await prisma.movie.update({ where: { id }, data: updateData })

  await logAdminAction({
    actorId: auth.user.email, action: 'update', targetType: 'movie', targetId: id,
    metadata: { title: updated.title, changes: Object.keys(parsed.data) },
    ipAddress: getClientIp(req.headers),
  })

  return successResponse(updated)
}

// DELETE /api/admin/movies/[id] — soft delete via deletedAt
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.delete')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return errorResponse('Movie not found', 404)

  await prisma.movie.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'archived', isPublished: false, updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'movie', targetId: id,
    metadata: { title: movie.title }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true })
}
