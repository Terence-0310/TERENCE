import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { movieUpdateSchema } from '@/src/be/modules/admin/validators'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { AdminMovieService } from '@/src/be/modules/movies/movie-service'
import { syncMovieAsync } from '@/src/be/modules/search/movie-search-indexer'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/movies/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.view')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await AdminMovieService.getMovieById(id)
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

  // RBAC: Overposting protection — prevent EDITOR or roles without 'movie.publish' from changing status
  if (parsed.data.status) {
    const { hasPermission } = await import('@/src/be/modules/auth/permissions')
    if (!(await hasPermission(auth.user, 'movie.publish'))) {
       delete parsed.data.status
    }
  }

  const movie = await AdminMovieService.getMovieById(id)
  if (!movie) return errorResponse('Movie not found', 404)

  // Check slug uniqueness if changed
  if (parsed.data.slug && parsed.data.slug !== movie.slug) {
    const dup = await AdminMovieService.getMovieBySlug(parsed.data.slug)
    if (dup) return errorResponse('Slug đã tồn tại', 409)
  }

  const updated = await AdminMovieService.updateMovie(id, parsed.data, auth.user.email)

  await logAdminAction({
    actorId: auth.user.email, action: 'update', targetType: 'movie', targetId: id,
    metadata: { title: updated.title, changes: Object.keys(parsed.data) },
    ipAddress: getClientIp(req.headers),
  })

  // Re-index in ES. If the movie became inactive / deleted, syncMovieAsync
  // will detect that and remove the document instead of upserting.
  syncMovieAsync(id, 'upsert')

  return successResponse(updated)
}

// DELETE /api/admin/movies/[id] — soft delete via deletedAt
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.delete')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await AdminMovieService.getMovieById(id)
  if (!movie) return errorResponse('Movie not found', 404)

  await AdminMovieService.softDeleteMovie(id, auth.user.email)

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'movie', targetId: id,
    metadata: { title: movie.title }, ipAddress: getClientIp(req.headers),
  })

  // Pull the doc out of the search index so the soft-deleted movie stops
  // appearing in search results immediately.
  syncMovieAsync(id, 'delete')

  return successResponse({ ok: true })
}
