// ============================================
// Auth Guards — Shared across all server modules
// ============================================
// Re-exports from legacy auth system for backward compatibility.
// TODO [MIGRATION] Move auth logic directly here once fully migrated.

export { getCurrentUser, type PublicUser } from '@/lib/auth/current-user'
export { getSession, createSession, deleteSession } from '@/lib/auth/session'
export { hasPermission, canAccessDashboard, type Permission, type Role, ROLES } from '@/lib/auth/permissions'
