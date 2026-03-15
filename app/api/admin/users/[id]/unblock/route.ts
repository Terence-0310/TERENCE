import { NextRequest } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, errorResponse, successResponse } from '@/lib/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/unblock
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.block')
  if (auth instanceof Response) return auth
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  if (user.status !== 'banned' && user.status !== 'suspended') {
    return errorResponse('Tài khoản không bị khóa')
  }

  await prisma.user.update({
    where: { id },
    data: { status: 'active', isActive: true, blockedReason: null },
  })

  await logAdminAction({
    actorId: auth.user.email, action: 'unblock', targetType: 'user', targetId: id,
    metadata: { email: user.email }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã mở khóa tài khoản' })
}
