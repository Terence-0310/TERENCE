import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { PERMISSION_LIST } from '@/src/constants/permissions'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('user.update')
  if (auth instanceof Response) return auth
  const { id } = await params

  // Fetch the user's specific permissions
  const userPerms = await prisma.userPermission.findMany({
    where: { userId: id },
    include: { permission: true }
  })

  const overrides = userPerms.map(up => ({
    key: up.permission.key,
    allowed: up.allowed,
    scope: up.scope
  }))

  return successResponse({ overrides })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin('user.role.update') // Only high privilege can modify permissions directly
  if (auth instanceof Response) return auth
  const { id } = await params

  const body = await parseBody<{ overrides: { key: string, allowed: boolean, scope?: string }[] }>(req)
  if (!body || !Array.isArray(body.overrides)) {
    return errorResponse('Invalid payload')
  }

  // Prevent modifying own permissions
  if ((auth.user as any).id === id) {
    return errorResponse('Không thể tự sửa quyền của chính mình', 403)
  }

  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) return errorResponse('User not found', 404)

  if (targetUser.role === 'SUPER_ADMIN') {
     return errorResponse('Không thể sửa quyền chi tiết của SUPER ADMIN', 403)
  }

  // Get all permission mappings to ensure we only save valid keys
  const allPerms = await prisma.permission.findMany()
  const permMap = new Map(allPerms.map(p => [p.key, p.id]))

  // Begin transaction to replace all custom permissions
  await prisma.$transaction(async (tx) => {
    // Drop all old overrides
    await tx.userPermission.deleteMany({
      where: { userId: id }
    })

    // Insert new ones
    for (const ov of body.overrides) {
      if (PERMISSION_LIST.includes(ov.key as any)) {
        const permId = permMap.get(ov.key)
        if (!permId) continue

        await tx.userPermission.create({
          data: {
            userId: id,
            permissionId: permId,
            allowed: ov.allowed,
            scope: ov.scope || 'all'
          }
        })
      }
    }
  })

  // Log audit
  await logAdminAction({
      actorId: auth.user.email,
      action: 'update_permissions',
      targetType: 'user',
      targetId: id,
      metadata: { changes: body.overrides },
      ipAddress: getClientIp(req.headers)
  })

  return successResponse({ ok: true, message: 'Updated dynamic permissions' })
}
