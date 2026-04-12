// ============================================
// Admin CRUD for Video Sources
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, parsePagination, paginatedResponse, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { z } from 'zod'

const videoSourceCreateSchema = z.object({
  episodeId: z.string().min(1, 'Episode ID là bắt buộc'),
  sourceType: z.enum(['hls', 'mp4']).default('hls'),
  url: z.string().min(1, 'URL là bắt buộc').max(2000).url('URL không hợp lệ'),
  label: z.string().max(100).default('Main'),
  mimeType: z.string().max(100).optional().nullable(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  drmType: z.string().max(50).optional().nullable(),
})

const videoSourceUpdateSchema = videoSourceCreateSchema.partial().omit({ episodeId: true })

// GET /api/admin/video-sources?episodeId=xxx
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('episodes.view')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePagination(sp)
  const episodeId = sp.get('episodeId') || ''

  const where: Record<string, unknown> = {}
  if (episodeId) where.episodeId = episodeId

  const [data, total] = await Promise.all([
    prisma.videoSource.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: { episode: { select: { episodeName: true, movie: { select: { title: true } } } } },
    }),
    prisma.videoSource.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

// POST /api/admin/video-sources
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('episodes.create')
  if (auth instanceof Response) return auth

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = videoSourceCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  // Validate episode exists
  const episode = await prisma.episode.findUnique({ where: { id: parsed.data.episodeId } })
  if (!episode) return errorResponse('Episode not found', 404)

  // Validate: HLS sources must have .m3u8 URL
  if (parsed.data.sourceType === 'hls' && !parsed.data.url.includes('.m3u8')) {
    return errorResponse('HLS source URL must be a .m3u8 file')
  }

  // If isPrimary, unset other primary sources for this episode
  if (parsed.data.isPrimary) {
    await prisma.videoSource.updateMany({
      where: { episodeId: parsed.data.episodeId, isPrimary: true },
      data: { isPrimary: false },
    })
  }

  const source = await prisma.videoSource.create({
    data: {
      ...parsed.data,
      mimeType: parsed.data.mimeType || (parsed.data.sourceType === 'hls' ? 'application/x-mpegURL' : 'video/mp4'),
    },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'create', targetType: 'video_source', targetId: source.id,
    metadata: { episodeId: episode.id, url: parsed.data.url }, ipAddress: getClientIp(req.headers),
  })

  return successResponse(source, 201)
}

// PUT /api/admin/video-sources (with ?id=xxx)
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin('episodes.edit')
  if (auth instanceof Response) return auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return errorResponse('ID is required')

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = videoSourceUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const existing = await prisma.videoSource.findUnique({ where: { id } })
  if (!existing) return errorResponse('Video source not found', 404)

  // Validate HLS URL
  const sourceType = parsed.data.sourceType || existing.sourceType
  const url = parsed.data.url || existing.url
  if (sourceType === 'hls' && !url.includes('.m3u8')) {
    return errorResponse('HLS source URL must be a .m3u8 file')
  }

  // If setting isPrimary, unset others
  if (parsed.data.isPrimary) {
    await prisma.videoSource.updateMany({
      where: { episodeId: existing.episodeId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    })
  }

  const updated = await prisma.videoSource.update({ where: { id }, data: parsed.data })

  await logAdminAction({
    actorId: auth.user.email, action: 'update', targetType: 'video_source', targetId: id,
    metadata: parsed.data, ipAddress: getClientIp(req.headers),
  })

  return successResponse(updated)
}

// DELETE /api/admin/video-sources?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin('episodes.delete')
  if (auth instanceof Response) return auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return errorResponse('ID is required')

  const existing = await prisma.videoSource.findUnique({ where: { id } })
  if (!existing) return errorResponse('Video source not found', 404)

  await prisma.videoSource.delete({ where: { id } })

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'video_source', targetId: id,
    metadata: { episodeId: existing.episodeId }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ success: true })
}
