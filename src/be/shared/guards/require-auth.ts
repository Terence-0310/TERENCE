// ============================================
// Auth Guards — Shared across all server modules
// ============================================

export { AuthService } from '@/src/be/modules/auth'
export { hasPermission, canAccessDashboard, type Permission, type Role, ROLES } from '@/src/be/modules/auth/permissions'
