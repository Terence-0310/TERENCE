import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { episodeCreateSchema, episodeUpdateSchema } from '@/src/be/modules/admin/validators'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { EpisodesService } from '@/src/be/modules/episodes/episodes.service'

type Params = { params: Promise<{ id: string }> }

export class EpisodesController {
  // GET /api/admin/episodes
  static async getPaginated(req: NextRequest) {
    const auth = await requireAdmin('episodes.view')
    if (auth instanceof Response) return auth

    const sp = req.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(sp)
    const movieId = sp.get('movieId') || ''
    const status = sp.get('status') || ''

    const [data, total] = await EpisodesService.getPaginatedEpisodes(movieId, status, skip, limit)

    return paginatedResponse(data, total, page, limit)
  }

  // POST /api/admin/episodes
  static async create(req: NextRequest) {
    const auth = await requireAdmin('episodes.create')
    if (auth instanceof Response) return auth

    const body = await parseBody(req)
    if (!body) return errorResponse('Invalid request body')

    const parsed = episodeCreateSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

    const movie = await prisma.movie.findUnique({ where: { id: parsed.data.movieId } })
    if (!movie) return errorResponse('Movie not found', 404)

    const episode = await EpisodesService.createEpisode(parsed.data)

    await logAdminAction({
      actorId: auth.user.email, action: 'create', targetType: 'episode', targetId: episode.id,
      metadata: { movieId: movie.id, episodeNumber: episode.episodeNumber }, ipAddress: getClientIp(req.headers),
    })

    return successResponse(episode, 201)
  }

  // GET /api/admin/episodes/[id]
  static async getById(_req: NextRequest, { params }: Params) {
    const auth = await requireAdmin('episodes.view')
    if (auth instanceof Response) return auth
    const { id } = await params
    
    const episode = await EpisodesService.getEpisodeById(id)
    if (!episode) return errorResponse('Episode not found', 404)
    
    return successResponse(episode)
  }

  // PUT /api/admin/episodes/[id]
  static async update(req: NextRequest, { params }: Params) {
    const auth = await requireAdmin('episodes.edit')
    if (auth instanceof Response) return auth
    const { id } = await params

    const body = await parseBody(req)
    if (!body) return errorResponse('Invalid request body')

    const parsed = episodeUpdateSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

    const episode = await EpisodesService.getEpisodeById(id)
    if (!episode) return errorResponse('Episode not found', 404)

    const updated = await EpisodesService.updateEpisode(id, parsed.data)

    await logAdminAction({
      actorId: auth.user.email, action: 'update', targetType: 'episode', targetId: id,
      ipAddress: getClientIp(req.headers),
    })

    return successResponse(updated)
  }

  // DELETE /api/admin/episodes/[id]
  static async delete(req: NextRequest, { params }: Params) {
    const auth = await requireAdmin('episodes.delete')
    if (auth instanceof Response) return auth
    const { id } = await params

    const episode = await EpisodesService.getEpisodeById(id)
    if (!episode) return errorResponse('Episode not found', 404)

    await EpisodesService.deleteEpisode(id)

    await logAdminAction({
      actorId: auth.user.email, action: 'delete', targetType: 'episode', targetId: id,
      ipAddress: getClientIp(req.headers),
    })

    return successResponse({ ok: true })
  }
}
