import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { PERMISSION_LIST } from '@/src/constants/permissions'
import { hasPermission, canChangeRole } from '@/src/be/modules/auth/permissions'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-users-permissions' })

// Validate each override shape — prevents trash data sneaking into UserPermission.
const overrideSchema = z.object({
  key: z.string().min(1),
  allowed: z.boolean(),
  scope: z.string().optional(),
}).strict()
const overridesBodySchema = z.object({
  overrides: z.array(overrideSchema),
}).strict()

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
  try {
    const auth = await requireAdmin('user.role.update') // Only high privilege can modify permissions directly
    if (auth instanceof Response) return auth
    const { id } = await params

    const raw = await parseBody<unknown>(req)
    const parsed = overridesBodySchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse('Invalid payload')
    }
    const overrides = parsed.data.overrides

    // Prevent modifying own permissions
    if (auth.user.id === id) {
      return errorResponse('Không thể tự sửa quyền của chính mình', 403)
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return errorResponse('User not found', 404)

    if (targetUser.role === 'SUPER_ADMIN') {
      return errorResponse('Không thể sửa quyền chi tiết của SUPER ADMIN', 403)
    }

    // Only users below the actor in the role hierarchy can be edited.
    if (!canChangeRole(auth.user, targetUser.role, targetUser.role)) {
      return errorResponse('Chỉ được sửa quyền của người có cấp thấp hơn', 403)
    }

    // An actor may only GRANT permissions they hold themselves; otherwise two
    // admins could hand each other e.g. settings.update.
    // Grants that already exist (e.g. made by a SUPER_ADMIN) may be kept as-is.
    const validOverrides = overrides.filter(ov => (PERMISSION_LIST as readonly string[]).includes(ov.key))
    const existingGrants = new Set(
      (await prisma.userPermission.findMany({
        where: { userId: id, allowed: true },
        select: { permission: { select: { key: true } } },
      })).map(up => up.permission.key),
    )
    for (const ov of validOverrides) {
      if (ov.allowed && !existingGrants.has(ov.key) && !(await hasPermission(auth.user, ov.key))) {
        return errorResponse(`Không thể cấp quyền bạn không có: ${ov.key}`, 403)
      }
    }

    // Permission rows are created on demand — the table is not pre-seeded, and
    // overrides referencing a missing row used to be dropped silently.
    const permMap = new Map<string, string>()
    for (const ov of validOverrides) {
      const perm = await prisma.permission.upsert({
        where: { key: ov.key },
        update: {},
        create: { key: ov.key, name: ov.key.split('.').join(' ').toUpperCase() },
      })
      permMap.set(perm.key, perm.id)
    }

    // Resolve actor id (audit log stores user id, not email) so the audit insert
    // can live inside the same $transaction as the permission writes.
    let actorId = auth.user.id
    if (!actorId && auth.user.email) {
      const u = await prisma.user.findUnique({ where: { email: auth.user.email }, select: { id: true } })
      actorId = u?.id ?? ''
    }
    const ipAddress = getClientIp(req.headers)

    // Begin transaction to replace all custom permissions AND write audit log atomically.
    // If audit log fails, the permission change is rolled back — we surface a 500.
    await prisma.$transaction(async (tx) => {
      // Drop all old overrides
      await tx.userPermission.deleteMany({ where: { userId: id } })

      // Insert new ones (skip unknown / invalid keys)
      for (const ov of validOverrides) {
        const permId = permMap.get(ov.key)
        if (!permId) continue

        await tx.userPermission.create({
          data: {
            userId: id,
            permissionId: permId,
            allowed: ov.allowed,
            scope: ov.scope || 'all',
          },
        })
      }

      // Inline audit log (atomic with the permission change).
      if (actorId) {
        await tx.adminLog.create({
          data: {
            actorId,
            action: 'update_permissions',
            resource: 'user',
            resourceId: id,
            metadataJson: JSON.stringify({ changes: overrides }),
            ipAddress,
          },
        })
      }
    })

    // Best-effort secondary log via logAdminAction — only fires when we couldn't
    // resolve the actor id inside the transaction (e.g. orphaned email).
    if (!actorId) {
      await logAdminAction({
        actorId: auth.user.email,
        action: 'update_permissions',
        targetType: 'user',
        targetId: id,
        metadata: { changes: overrides },
        ipAddress,
      })
    }

    return successResponse({ ok: true, message: 'Updated dynamic permissions' })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'PUT /admin/users/[id]/permissions failed — change rolled back')
    return errorResponse('Internal Server Error', 500)
  }
}
