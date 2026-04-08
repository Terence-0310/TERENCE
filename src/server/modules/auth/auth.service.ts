// ============================================
// Auth Module — Service
// ============================================
// Business logic for authentication.
// Re-exports from legacy lib/auth/* for now.
// TODO [MIGRATION] Move actual logic here once all consumers migrate.

// Re-export legacy functions
export { verifyPassword, hashPassword } from '@/lib/auth/password'
export { createSession, getSession, deleteSession, getSessionIdFromCookie } from '@/lib/auth/session'
export { getCurrentUser } from '@/lib/auth/current-user'
export type { PublicUser } from '@/lib/auth/current-user'
