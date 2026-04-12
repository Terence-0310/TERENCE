// ============================================
// Admin CRUD for Subtitle Tracks
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { z } from 'zod'

const subtitleCreateSchema = z.object({
  episodeId: z.string().min(1, 'Episode ID là bắt buộc'),
  label: z.string().min(1, 'Label là bắt buộc').max(100),
  lang: z.string().min(1, 'Language code là bắt buộc').max(10),
  url: z.string().min(1, 'URL là bắt buộc').max(2000).url('URL không hợp lệ'),
  isDefault: z.boolean().default(false),
  kind: z.enum(['subtitles', 'captions']).default('subtitles'),
  isActive: z.boolean().default(true),
})

const subtitleUpdateSchema = subtitleCreateSchema.partial().omit({ episodeId: true })

// GET
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('episodes.view')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePagination(sp)
  const episodeId = sp.get('episodeId') || ''

  const where: Record<string, unknown> = {}
  if (episodeId) where.episodeId = episodeId

  const [data, total] = await Promise.all([
    prisma.subtitleTrack.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { episode: { select: { episodeName: true, movie: { select: { title: true } } } } },
    }),
    prisma.subtitleTrack.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

// POST
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('episodes.create')
  if (auth instanceof Response) return auth

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = subtitleCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const episode = await prisma.episode.findUnique({ where: { id: parsed.data.episodeId } })
  if (!episode) return errorResponse('Episode not found', 404)

  // Validate VTT URL
  if (!parsed.data.url.endsWith('.vtt') && !parsed.data.url.includes('.vtt?')) {
    return errorResponse('Subtitle URL should be a .vtt file')
  }

  // If isDefault, unset others
  if (parsed.data.isDefault) {
    await prisma.subtitleTrack.updateMany({
      where: { episodeId: parsed.data.episodeId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const subtitle = await prisma.subtitleTrack.create({ data: parsed.data })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'subtitle_track', targetId: subtitle.id,
    metadata: { episodeId: episode.id, lang: parsed.data.lang }, ipAddress: getClientIp(req.headers),
  })

  return successResponse(subtitle, 201)
}

// PUT
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin('episodes.edit')
  if (auth instanceof Response) return auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return errorResponse('ID is required')

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = subtitleUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const existing = await prisma.subtitleTrack.findUnique({ where: { id } })
  if (!existing) return errorResponse('Subtitle not found', 404)

  if (parsed.data.isDefault) {
    await prisma.subtitleTrack.updateMany({
      where: { episodeId: existing.episodeId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.subtitleTrack.update({ where: { id }, data: parsed.data })

  await logAdminAction({
    actorId: auth.user.email, action: 'update', targetType: 'subtitle_track', targetId: id,
    metadata: parsed.data, ipAddress: getClientIp(req.headers),
  })

  return successResponse(updated)
}

// DELETE
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin('episodes.delete')
  if (auth instanceof Response) return auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return errorResponse('ID is required')

  const existing = await prisma.subtitleTrack.findUnique({ where: { id } })
  if (!existing) return errorResponse('Subtitle not found', 404)

  await prisma.subtitleTrack.delete({ where: { id } })

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'subtitle_track', targetId: id,
    metadata: { episodeId: existing.episodeId }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ success: true })
}
