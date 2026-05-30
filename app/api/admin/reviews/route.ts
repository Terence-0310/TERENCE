import { NextRequest } from 'next/server'
import { requireAdmin, parsePagination, paginatedResponse } from '@/src/be/modules/admin/api-helpers'
import { listPendingReviews } from '@/src/be/modules/reviews/reviews.moderation'

// GET /api/admin/reviews — pending reviews awaiting moderation.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('review.moderate')
  if (auth instanceof Response) return auth

  const { page, limit } = parsePagination(req.nextUrl.searchParams)
  const { items, total } = await listPendingReviews(page, limit)
  return paginatedResponse(items, total, page, limit)
}
