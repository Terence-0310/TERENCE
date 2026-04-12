import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { episodeUpdateSchema } from '@/src/be/modules/admin/validators'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { EpisodesService } from '@/src/be/modules/episodes/episodes.service'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('episodes.view')
  if (auth instanceof Response) return auth
  const { id } = await params
  
  const episode = await EpisodesService.getEpisodeById(id)
  if (!episode) return errorResponse('Episode not found', 404)
  
  return successResponse(episode)
}

export async function PUT(req: NextRequest, { params }: Params) {
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

export async function DELETE(req: NextRequest, { params }: Params) {
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
