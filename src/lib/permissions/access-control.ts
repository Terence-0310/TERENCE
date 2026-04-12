import { prisma } from '@/src/be/shared/db/prisma'
import { ROLES, RoleType } from '@/src/constants/roles'
import { ActionScope, EffectivePermission } from '@/src/types/permission'
import { Role } from '@prisma/client'
import { ROLE_PERMISSION_MATRIX } from './role-permissions'

export interface AccessContext {
  resourceOwnerId?: string
  targetUserRole?: RoleType
}

/**
 * Lấy danh sách permission thực tế của user, gộp từ Role và User overrides.
 */
export async function getUserEffectivePermissions(userId: string, role: string): Promise<EffectivePermission[]> {
  let rolePerms: any[] = []
  let userPerms: any[] = []

  try {
    if (process.env.DATABASE_URL) {
      const results = await Promise.all([
        prisma.rolePermission.findMany({
          where: { role: role as Role },
          include: { permission: true }
        }),
        prisma.userPermission.findMany({
          where: { userId },
          include: { permission: true }
        })
      ])
      rolePerms = results[0]
      userPerms = results[1]
    }
  } catch (e) {
    console.warn(`[access-control] Failed to query dynamic permissions from DB, using fallback matrix. Error: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  const effectiveMap = new Map<string, EffectivePermission>()

  // 1. Apply Role Permissions (Fallback to in-memory matrix if DB isn't seeded)
  if (rolePerms.length === 0) {
    const memoryPerms = ROLE_PERMISSION_MATRIX[role] || []
    memoryPerms.forEach(mp => {
      effectiveMap.set(mp.permission, {
        key: mp.permission,
        scope: mp.scope,
        allowed: true
      })
    })
  } else {
    rolePerms.forEach(rp => {
      effectiveMap.set(rp.permission.key, {
        key: rp.permission.key,
        scope: (rp.scope as ActionScope) || 'none',
        allowed: true
      })
    })
  }

  // 2. Apply User Overrides (higher priority)
  userPerms.forEach(up => {
    if (!up.allowed) {
      effectiveMap.delete(up.permission.key) // Revoked explicit
    } else {
      // Create or override 
      effectiveMap.set(up.permission.key, {
        key: up.permission.key,
        scope: (up.scope as ActionScope) || 'none',
        allowed: true
      })
    }
  })

  return Array.from(effectiveMap.values())
}

/**
 * Kiểm tra xem user có một permission nhất định hay không
 */
export async function hasPermission(
  user: { id: string; role: string } | null,
  permissionKey: string,
  requiredScope: ActionScope = 'all',
  context?: AccessContext
): Promise<boolean> {
  if (!user) return false
  
  // Super admin overrides all general checks, except certain policy restrictions
  if (user.role === ROLES.SUPER_ADMIN) {
     return true
  }

  const permissions = await getUserEffectivePermissions(user.id, user.role)
  const perm = permissions.find(p => p.key === permissionKey)

  if (!perm) return false

  // Check scope
  if (perm.scope === 'all') return true
  if (perm.scope === 'own') {
    if (requiredScope === 'all') return false // Needs full access but only has 'own'
    if (context?.resourceOwnerId && context.resourceOwnerId !== user.id) return false
    return true
  }

  return false
}

/**
 * Kiểm tra nhiều permission, cần ít nhất 1 (OR)
 */
export async function hasAnyPermission(
  user: { id: string; role: string } | null,
  permissionKeys: string[],
  context?: AccessContext
): Promise<boolean> {
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true

  const permissions = await getUserEffectivePermissions(user.id, user.role)
  return permissionKeys.some(key => permissions.some(p => p.key === key))
}

/**
 * Kiểm tra nhiều permission, cần TẤT CẢ (AND)
 */
export async function hasAllPermissions(
  user: { id: string; role: string } | null,
  permissionKeys: string[],
  context?: AccessContext
): Promise<boolean> {
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true

  const permissions = await getUserEffectivePermissions(user.id, user.role)
  return permissionKeys.every(key => permissions.some(p => p.key === key))
}
