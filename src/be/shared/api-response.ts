// ============================================
// Shared API Response Helpers
// ============================================
// Standardized response format following backend skill rules.
// Use these for NEW routes. Existing routes keep their current format
// to preserve backward compatibility.
//
// Standard shapes:
//   Success: { success: true, message: "...", data: {} }
//   Error:   { success: false, message: "..." }
//
// Usage:
//   import { apiSuccess, apiError, apiPaginated } from '@/src/be/shared/api-response'

import { NextResponse } from 'next/server'

// -------------------------------------------------------------------
// Success response
// -------------------------------------------------------------------
export function apiSuccess<T>(
  data: T,
  message: string = 'OK',
  status: number = 200,
) {
  return NextResponse.json(
    { success: true, message, data },
    { status },
  )
}

// -------------------------------------------------------------------
// Error response
// -------------------------------------------------------------------
export function apiError(
  message: string,
  status: number = 400,
) {
  return NextResponse.json(
    { success: false, message },
    { status },
  )
}

// -------------------------------------------------------------------
// Paginated response
// -------------------------------------------------------------------
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'OK',
) {
  return NextResponse.json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
