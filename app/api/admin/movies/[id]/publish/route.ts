import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/movies/[id]/publish
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movie.publish')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return errorResponse('Movie not found', 404)
  if (movie.deletedAt) return errorResponse('Không thể publish phim đã xóa')

  await prisma.movie.update({
    where: { id },
    data: { status: 'published', isPublished: true, updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'publish', targetType: 'movie', targetId: id,
    metadata: { title: movie.title }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã xuất bản phim' })
}
