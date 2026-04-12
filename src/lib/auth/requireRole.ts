import { Role } from '@prisma/client'

/**
 * Middleware Guard: Check if the current user has the required role.
 * Throws an error if forbidden.
 * 
 * @param user The current user object containing a role
 * @param roles Array of allowed roles
 */
export function requireRole(user: any, roles: string[]) {
  if (!user || !roles.includes(user.role)) {
    throw new Error("Forbidden")
  }
}
