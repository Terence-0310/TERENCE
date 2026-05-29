// ============================================
// Admin Shared — Role guard + AdminLog helper
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { requireAdmin as baseRequireAdmin } from '@/src/be/shared/guards/require-auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-utils' })

/**
 * Verify admin session using 5-level RBAC. Returns session format or NextResponse error.
 * @param minRole optional, not used anymore because baseRequireAdmin handles dashboard.access correctly.
 */
export async function requireAdmin(_minRole: string = 'editor') {
  const result = await baseRequireAdmin()
  if (result instanceof Response) {
    return { error: result as NextResponse }
  }

  // Format to match old interface
  return { 
    session: { user: result.user, userId: result.user.id }, 
    userId: result.user.id, 
    user: result.user 
  }
}

/**
 * Log an admin action to AdminLog table.
 */
export async function logAdminAction(
  userId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, any>,
) {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
    || hdrs.get('x-real-ip')
    || null

  try {
    await prisma.adminLog.create({
      data: {
        actorId: userId,
        action,
        resource: targetType || 'unknown',
        resourceId: targetId ?? null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ip,
      },
    })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Failed to write log')
  }
}

/**
 * Standard paginated response builder.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
