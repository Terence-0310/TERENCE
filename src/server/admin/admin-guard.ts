// ============================================
// Admin API Guard
// ============================================
// Shared auth guard for all admin sync/control routes.
// Uses the existing session + role-based permission system.

import { getCurrentUser, type PublicUser } from '@/lib/auth/current-user'
import { NextResponse } from 'next/server'

const ADMIN_ROLES = ['super_admin', 'admin']

/**
 * Verify the request is from an authenticated admin user.
 * Returns the user if authorized, or a 401/403 NextResponse.
 */
export async function requireAdmin(): Promise<PublicUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }
  return user
}

/** Type guard: check if the return value is a user (not an error response) */
export function isUser(result: PublicUser | NextResponse): result is PublicUser {
  return !(result instanceof NextResponse)
}
