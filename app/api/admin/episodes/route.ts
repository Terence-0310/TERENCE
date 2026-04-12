import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { episodeCreateSchema } from '@/src/be/modules/admin/validators'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { EpisodesService } from '@/src/be/modules/episodes/episodes.service'

// GET /api/admin/episodes?movieId=xxx
export async function GET(req: NextRequest) {
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
export async function POST(req: NextRequest) {
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
