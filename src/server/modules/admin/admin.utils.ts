// ============================================
// Admin Shared — Role guard + AdminLog helper
// ============================================

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/auth/db'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// ── Role hierarchy (higher index = more power) ──
const ROLE_LEVELS: Record<string, number> = {
  user: 0,
  moderator: 1,
  editor: 2,
  staff: 3,
  admin: 4,
  super_admin: 5,
  SUPER_ADMIN: 5,
  ADMIN: 4,
  STAFF: 3,
  EDITOR: 2,
  MODERATOR: 1,
  USER: 0,
}

/**
 * Verify admin session. Returns session or NextResponse error.
 * @param minRole minimum role required (default: 'editor')
 */
export async function requireAdmin(minRole: string = 'editor') {
  const session = await getSession()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const userLevel = ROLE_LEVELS[session.user.role] ?? 0
  const requiredLevel = ROLE_LEVELS[minRole] ?? 0

  if (userLevel < requiredLevel) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session, userId: session.userId, user: session.user }
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
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ip,
      },
    })
  } catch (err) {
    console.error('[AdminLog] Failed to write log:', err)
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
