// ============================================
// Unified API Response & Error Handling
// ============================================
// Single source of truth for ALL API response shapes.
// Replaces duplicated helpers in lib/api/response.ts and lib/admin/api-helpers.ts
//
// Standard shapes:
//   Success:    { success: true, data: T, message?: string }
//   Error:      { success: false, error: string, code?: string }
//   Paginated:  { success: true, data: T[], pagination: {...} }

import { NextRequest, NextResponse } from 'next/server'
import { ZodError, type ZodSchema } from 'zod'

// -------------------------------------------------------------------
// Response Types
// -------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiPaginatedResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

// -------------------------------------------------------------------
// Success Responses
// -------------------------------------------------------------------

export function ok<T>(data: T, message?: string): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data, message }, { status: 200 })
}

export function created<T>(data: T, message?: string): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data, message }, { status: 201 })
}

// -------------------------------------------------------------------
// Error Responses
// -------------------------------------------------------------------

export function badRequest(error: string, code?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error, code }, { status: 400 })
}

export function unauthorized(error = 'Chưa đăng nhập'): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 401 })
}

export function forbidden(error = 'Không có quyền truy cập'): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 403 })
}

export function notFound(error = 'Không tìm thấy'): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 404 })
}

export function conflict(error: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 409 })
}

export function tooManyRequests(error = 'Quá nhiều yêu cầu, thử lại sau'): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 429 })
}

export function serverError(error = 'Lỗi máy chủ nội bộ'): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error }, { status: 500 })
}

// -------------------------------------------------------------------
// Paginated Response
// -------------------------------------------------------------------

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit)
  return NextResponse.json({
    success: true as const,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

// -------------------------------------------------------------------
// Pagination Parser
// -------------------------------------------------------------------

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): PaginationParams {
  const { page: defaultPage = 1, limit: defaultLimit = 20, maxLimit = 100 } = defaults
  const rawPage = parseInt(searchParams.get('page') || String(defaultPage), 10)
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10)
  const page = Math.max(1, isNaN(rawPage) ? defaultPage : rawPage)
  const limit = Math.min(maxLimit, Math.max(1, isNaN(rawLimit) ? defaultLimit : rawLimit))
  return { page, limit, skip: (page - 1) * limit }
}

// -------------------------------------------------------------------
// Sort Parser
// -------------------------------------------------------------------

export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function parseSort(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc',
): SortParams {
  const rawSort = searchParams.get('sort') || defaultField
  const sortBy = allowedFields.includes(rawSort) ? rawSort : defaultField
  const rawOrder = searchParams.get('order')
  const sortOrder = rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : defaultOrder
  return { sortBy, sortOrder }
}

// -------------------------------------------------------------------
// Filter Parser
// -------------------------------------------------------------------

export function parseFilters(
  searchParams: URLSearchParams,
  allowedFilters: string[],
): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const key of allowedFilters) {
    const value = searchParams.get(key)
    if (value) filters[key] = value
  }
  return filters
}

// -------------------------------------------------------------------
// Body Parser with Zod Validation
// -------------------------------------------------------------------

export async function parseAndValidate<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse<ApiErrorResponse> }> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return { error: badRequest(messages, 'VALIDATION_ERROR') }
    }

    return { data: result.data }
  } catch {
    return { error: badRequest('Body JSON không hợp lệ', 'INVALID_JSON') }
  }
}

// -------------------------------------------------------------------
// Error Message Extractor
// -------------------------------------------------------------------

export function getErrorMessage(error: unknown, fallback = 'Lỗi không xác định'): string {
  if (error instanceof ZodError) {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

// -------------------------------------------------------------------
// API Handler Wrapper (catch-all error handler)
// -------------------------------------------------------------------

type ApiHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error(`[API] ${req.method} ${req.nextUrl.pathname}:`, error)
      return serverError(getErrorMessage(error))
    }
  }
}
