import { PublicUser } from './auth.service'

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'EDITOR', 'USER'] as const
export type Role = typeof ROLES[number]

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  staff: 60,
  editor: 40,
  user: 0,
}

export type Permission =
  | 'dashboard.access'
  | 'movies.view' | 'movies.create' | 'movies.edit' | 'movies.delete'
  | 'episodes.view' | 'episodes.create' | 'episodes.edit' | 'episodes.delete'
  | 'shorts.view' | 'shorts.create' | 'shorts.edit' | 'shorts.delete'
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete' | 'users.block' | 'users.change_role'
  | 'logs.view'
  | 'uploads.manage'
  | 'reports.view'
  | 'settings.manage'


import { hasPermission as newHasPermission } from '@/src/lib/permissions/access-control'
import { PERMISSIONS } from '@/src/constants/permissions'

// Accepts the legacy `Permission` union OR any new PermissionKey string —
// the internal map normalises both into the canonical key.
export async function hasPermission(user: PublicUser | null, permission: Permission | string): Promise<boolean> {
  if (!user || !user.role) return false
  
  const map: Record<string, string> = {
    'dashboard.access': 'dashboard.view',
    'movies.view': 'movie.read',
    'movies.create': 'movie.create',
    'movies.edit': 'movie.update',
    'movies.delete': 'movie.delete',
    'episodes.view': 'episode.read',
    'episodes.create': 'episode.create',
    'episodes.edit': 'episode.update',
    'episodes.delete': 'episode.delete',
    'users.view': 'user.read',
    'users.create': 'user.create',
    'users.edit': 'user.update',
    'users.delete': 'user.delete',
    'users.block': 'user.block',
    'users.change_role': 'user.role.update',
    'logs.view': 'adminlog.read',
    'settings.manage': 'settings.update',
  }
  
  const newKey = map[permission] || permission

  return newHasPermission(
    { id: user.id || '', role: typeof user.role === 'string' ? user.role.toUpperCase() : 'USER' },
    newKey
  )
}

export async function canAccessDashboard(user: PublicUser | null): Promise<boolean> {
  return hasPermission(user, PERMISSIONS.DASHBOARD_VIEW as Permission)
}

export function canChangeRole(actor: PublicUser, targetCurrentRole: string, newRole: string): boolean {
  const actorKey = typeof actor.role === 'string' ? actor.role.toLowerCase() : ''
  const targetKey = typeof targetCurrentRole === 'string' ? targetCurrentRole.toLowerCase() : ''
  const newKey = typeof newRole === 'string' ? newRole.toLowerCase() : ''

  const actorLevel = ROLE_HIERARCHY[actorKey] || 0
  const targetLevel = ROLE_HIERARCHY[targetKey] || 0
  const newLevel = ROLE_HIERARCHY[newKey] || 0
  // Cannot promote above own level, cannot demote equal/above level
  return actorLevel > targetLevel && actorLevel > newLevel
}

export function getRoleLabel(role: string): string {
  const roleKey = typeof role === 'string' ? role.toLowerCase() : ''
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    editor: 'Editor',
    user: 'User',
  }
  return labels[roleKey] || role
}
