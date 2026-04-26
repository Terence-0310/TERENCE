import { NextRequest, NextResponse } from 'next/server'
import { AuthService, type PublicUser } from '@/src/be/modules/auth'
export { requireAdmin, requireAuth } from '@/src/be/shared/guards/require-auth'

/** Parse search params for pagination */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/** Build paginated JSON response */
export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/** Error response helper */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Success response helper */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/** Parse JSON body safely */
export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json() as T
  } catch {
    return null
  }
}

/**
 * Extract a human-readable message from an unknown caught value.
 * Use this in catch blocks instead of `catch (err: any) { err.message }`.
 */
export function getErrorMessage(error: unknown, fallback = 'Internal server error'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}
