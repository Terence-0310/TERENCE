import { ROLES } from '@/src/constants/roles'

export interface UIAuthUser {
  role?: string
  permissions?: string[]
}

export function can(user: UIAuthUser | null | undefined, permissionKey: string): boolean {
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true
  
  return user.permissions?.includes(permissionKey) ?? false
}

export function canAny(user: UIAuthUser | null | undefined, permissionKeys: string[]): boolean {
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true

  return permissionKeys.some(key => user.permissions?.includes(key))
}

export function canAll(user: UIAuthUser | null | undefined, permissionKeys: string[]): boolean {
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true

  return permissionKeys.every(key => user.permissions?.includes(key))
}
