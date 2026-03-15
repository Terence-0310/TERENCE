import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse } from '@/lib/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/movies/[id]/archive
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return errorResponse('Movie not found', 404)

  await prisma.movie.update({
    where: { id },
    data: { status: 'archived', isPublished: false, updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'archive', targetType: 'movie', targetId: id,
    metadata: { title: movie.title }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã lưu trữ phim' })
}
