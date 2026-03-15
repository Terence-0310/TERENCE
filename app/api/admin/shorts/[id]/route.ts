import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/lib/admin/api-helpers'
import { shortUpdateSchema } from '@/lib/admin/validators'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/shorts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('shorts.view')
  if (auth instanceof Response) return auth
  const { id } = await params

  const short = await prisma.short.findUnique({
    where: { id },
    include: { movie: { select: { id: true, title: true } } },
  })
  if (!short) return errorResponse('Short not found', 404)
  return successResponse(short)
}

// PATCH /api/admin/shorts/[id] — update short
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('shorts.edit')
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody(req)
  if (!body) return errorResponse('Invalid request body')

  const parsed = shortUpdateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message || 'Validation error')

  const short = await prisma.short.findUnique({ where: { id } })
  if (!short) return errorResponse('Short not found', 404)

  // Check slug uniqueness
  if (parsed.data.slug && parsed.data.slug !== short.slug) {
    const dup = await prisma.short.findUnique({ where: { slug: parsed.data.slug } })
    if (dup) return errorResponse('Slug đã tồn tại', 409)
  }

  const updated = await prisma.short.update({
    where: { id },
    data: { ...parsed.data, updatedBy: auth.user.email },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'update', targetType: 'short', targetId: id,
    metadata: { title: updated.title, changes: Object.keys(parsed.data) },
    ipAddress: getClientIp(req.headers),
  })

  return successResponse(updated)
}

// PUT as alias for PATCH
export { PATCH as PUT }

// DELETE /api/admin/shorts/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('shorts.delete')
  if (auth instanceof Response) return auth
  const { id } = await params

  const short = await prisma.short.findUnique({ where: { id } })
  if (!short) return errorResponse('Short not found', 404)

  await prisma.short.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'delete', targetType: 'short', targetId: id,
    metadata: { title: short.title }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true })
}
