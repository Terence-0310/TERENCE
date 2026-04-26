// ============================================
// Admin API Guard
// ============================================
// Shared auth guard for all admin sync/control routes.
// Uses the existing session + role-based permission system.

import { requireAdmin as baseRequireAdmin } from '@/src/be/shared/guards/require-auth'
import { NextResponse } from 'next/server'
import { PublicUser } from '@/src/be/modules/auth'

/**
 * Verify the request is from an authenticated admin user (uses 5-level RBAC).
 * Returns the user if authorized, or a 401/403 NextResponse.
 */
export async function requireAdmin(): Promise<PublicUser | NextResponse> {
  const result = await baseRequireAdmin()
  if (result instanceof Response) return result as NextResponse
  return result.user
}

/** Type guard: check if the return value is a user (not an error response) */
export function isUser(result: PublicUser | NextResponse): result is PublicUser {
  return !(result instanceof NextResponse)
}
