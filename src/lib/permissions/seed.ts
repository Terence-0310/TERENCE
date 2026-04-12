import { prisma } from '@/src/be/shared/db/prisma'
import { PERMISSION_LIST } from '@/src/constants/permissions'
import { ROLE_PERMISSION_MATRIX } from './role-permissions'
import { Role } from '@prisma/client'

/**
 * Idempotent seed function for Permissions and RolePermissions.
 * It will insert missing permissions and map them correctly to the roles.
 */
export async function seedPermissions() {
  console.log('Seeding dynamic permissions...')

  // 1. Seed Permissions
  for (const permKey of PERMISSION_LIST) {
    await prisma.permission.upsert({
      where: { key: permKey },
      update: {}, // DO NOT overwrite names/descriptions if customized later
      create: {
        key: permKey,
        name: permKey.split('.').join(' ').toUpperCase(),
      },
    })
  }

  // 2. Fetch all permissions to get their IDs
  const allPerms = await prisma.permission.findMany()
  const permMap = new Map(allPerms.map(p => [p.key, p.id]))

  // 3. Seed RolePermissions
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    // Only process valid Prisma roles
    if (!(roleName in Role)) continue;
    const currentRole = roleName as Role

    for (const config of permissions) {
      const permId = permMap.get(config.permission)
      if (!permId) continue

      // Upsert RolePermission entry to avoid duplicates
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId_scope: {
            role: currentRole,
            permissionId: permId,
            scope: config.scope,
          }
        },
        update: {}, // Already exists
        create: {
          role: currentRole,
          permissionId: permId,
          scope: config.scope,
        }
      })
    }
  }

  console.log('Dynamic permissions seeding completed.')
}
