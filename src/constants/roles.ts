export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  EDITOR: 'EDITOR',
  USER: 'USER',
} as const

export type RoleType = typeof ROLES[keyof typeof ROLES]

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  STAFF: 60,
  EDITOR: 40,
  USER: 0,
}
