import { prisma } from '@/src/be/shared/db/prisma'

// JWT sessions are stateless, so a block/role change made by an admin would
// otherwise only take effect at the next login. Session checks call this to
// re-read the account; a short cache keeps it to ~1 query per user per window.

export interface AccountStatus {
  active: boolean
  role: string
  isEmailVerified: boolean
}

const TTL_MS = 30_000
// On globalThis: Next bundles each route separately, so a module-level Map
// would be duplicated and an invalidate in one route would miss the others.
const g = globalThis as unknown as { __accountStatusCache?: Map<string, { at: number; status: AccountStatus | null }> }
const cache = (g.__accountStatusCache ??= new Map())

/** null = account no longer exists. Throws only if the DB is unreachable. */
export async function getAccountStatus(userId: string): Promise<AccountStatus | null> {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, deletedAt: true, role: true, isEmailVerified: true },
  })
  const status = user
    ? { active: user.isActive && !user.deletedAt, role: user.role, isEmailVerified: user.isEmailVerified }
    : null
  cache.set(userId, { at: Date.now(), status })
  return status
}

/** Drop the cached status so an admin action applies on the next request. */
export function invalidateAccountStatus(userId: string) {
  cache.delete(userId)
}
