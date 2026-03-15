import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse } from '@/lib/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/movies/[id]/feature — toggle isFeatured
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('movies.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return errorResponse('Movie not found', 404)

  const newValue = !movie.isFeatured
  await prisma.movie.update({
    where: { id },
    data: { isFeatured: newValue, updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'toggle_featured', targetType: 'movie', targetId: id,
    metadata: { title: movie.title, isFeatured: newValue }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, isFeatured: newValue })
}
