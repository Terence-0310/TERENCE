// ============================================
// Auth Guards — Shared across all server modules
// ============================================

import { NextResponse } from 'next/server'
import { AuthService, type PublicUser } from '@/src/be/modules/auth'
import { hasPermission, canAccessDashboard, type Permission, type Role, ROLES } from '@/src/be/modules/auth/permissions'

export { AuthService, hasPermission, canAccessDashboard, type Permission, type Role, ROLES }

/**
 * Global Guard: Validates session and returns the current user.
 * If a permission is provided, it verifies the user holds it before allowing access.
 */
export async function requireAuth(
  permission?: Permission | string
): Promise<{ user: PublicUser } | NextResponse> {
  const user = await AuthService.getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (permission && !(await hasPermission(user, permission))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { user }
}

/**
 * Admin Guard: Validates session and ensures user has at least dashboard access.
 * If a specific permission is provided, it verifies the user holds it.
 */
export async function requireAdmin(
  permission?: Permission | string
): Promise<{ user: PublicUser } | NextResponse> {
  const user = await AuthService.getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Luôn luôn kiểm tra quyền truy cập dashboard (để cản role USER)
  if (!(await canAccessDashboard(user))) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  // Nếu có permission cụ thể, kiểm tra thêm
  if (permission && !(await hasPermission(user, permission))) {
    return NextResponse.json({ error: 'Forbidden: Missing specific permission' }, { status: 403 })
  }
  
  return { user }
}
