import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { invalidateAccountStatus } from '@/src/be/modules/auth/account-status'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/restore
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('users.delete') // restore requires delete-level perm
  if (auth instanceof Response) return auth
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)

  if (!user.deletedAt) {
    return errorResponse('Tài khoản chưa bị xóa')
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: null, isActive: true, status: 'active' },
  })
  invalidateAccountStatus(id)

  await logAdminAction({
    actorId: auth.user.email, action: 'restore', targetType: 'user', targetId: id,
    metadata: { email: user.email, name: user.name }, ipAddress: getClientIp(req.headers),
  })

  return successResponse({ ok: true, message: 'Đã khôi phục tài khoản' })
}
