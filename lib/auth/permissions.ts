import type { PublicUser } from './current-user'

export const ROLES = ['super_admin', 'admin', 'staff', 'editor', 'user'] as const
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

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    'dashboard.access', 'movies.view', 'movies.create', 'movies.edit', 'movies.delete',
    'episodes.view', 'episodes.create', 'episodes.edit', 'episodes.delete',
    'shorts.view', 'shorts.create', 'shorts.edit', 'shorts.delete',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.block', 'users.change_role',
    'logs.view', 'uploads.manage', 'reports.view', 'settings.manage',
  ],
  admin: [
    'dashboard.access', 'movies.view', 'movies.create', 'movies.edit', 'movies.delete',
    'episodes.view', 'episodes.create', 'episodes.edit', 'episodes.delete',
    'shorts.view', 'shorts.create', 'shorts.edit', 'shorts.delete',
    'users.view', 'users.create', 'users.edit', 'users.block', 'users.change_role',
    'logs.view', 'uploads.manage', 'reports.view',
  ],
  staff: [
    'dashboard.access', 'movies.view', 'movies.create', 'movies.edit',
    'episodes.view', 'episodes.create', 'episodes.edit',
    'shorts.view', 'shorts.create', 'shorts.edit',
    'users.view', 'uploads.manage',
  ],
  editor: [
    'dashboard.access', 'movies.view', 'movies.create', 'movies.edit',
    'episodes.view', 'episodes.create', 'episodes.edit',
    'shorts.view', 'shorts.create', 'shorts.edit',
    'uploads.manage',
  ],
  user: [],
}

export function hasPermission(user: PublicUser | null, permission: Permission): boolean {
  if (!user) return false
  const perms = ROLE_PERMISSIONS[user.role] || []
  return perms.includes(permission)
}

export function canAccessDashboard(user: PublicUser | null): boolean {
  return hasPermission(user, 'dashboard.access')
}

export function canChangeRole(actor: PublicUser, targetCurrentRole: string, newRole: string): boolean {
  const actorLevel = ROLE_HIERARCHY[actor.role] || 0
  const targetLevel = ROLE_HIERARCHY[targetCurrentRole] || 0
  const newLevel = ROLE_HIERARCHY[newRole] || 0
  // Cannot promote above own level, cannot demote equal/above level
  return actorLevel > targetLevel && actorLevel > newLevel
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    editor: 'Editor',
    user: 'User',
  }
  return labels[role] || role
}
