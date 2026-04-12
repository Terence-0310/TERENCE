import { prisma } from '@/src/be/shared/db/prisma'

/**
 * Log an admin action to the AdminLog table.
 * `actorId` can be either a user ID or email — we resolve to user ID automatically.
 */
export async function logAdminAction(opts: {
  actorId: string       // user email or user ID
  action: string        // create | update | delete ...
  targetType?: string   // mapped to resource
  targetId?: string     // mapped to resourceId
  metadata?: Record<string, unknown>
  targetUserId?: string
  ipAddress?: string
  userAgent?: string
  // Support new format directly
  resource?: string
  resourceId?: string
}) {
  try {
    // Resolve actorId: if it looks like an email, find the user ID
    let resolvedActorId = opts.actorId
    if (opts.actorId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: opts.actorId },
        select: { id: true },
      })
      if (user) {
        resolvedActorId = user.id
      } else {
        // Can't find user — skip logging rather than crash
        console.warn(`[audit] Cannot find user with email: ${opts.actorId}`)
        return
      }
    }

    await prisma.adminLog.create({
      data: {
        actorId: resolvedActorId,
        action: opts.action,
        resource: opts.resource || opts.targetType || 'unknown',
        resourceId: opts.resourceId || opts.targetId || null,
        targetUserId: opts.targetUserId || null,
        metadataJson: opts.metadata ? JSON.stringify(opts.metadata) : null,
        ipAddress: opts.ipAddress || null,
        userAgent: opts.userAgent || null,
      },
    })
  } catch (e) {
    console.error('Failed to log admin action:', e)
  }
}

/** Extract client IP from request headers */
export function getClientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') || 'unknown'
}
