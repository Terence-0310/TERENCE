import { NextRequest } from 'next/server'
import { requireAdmin, parseBody, successResponse, errorResponse } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { approveReview, rejectReview } from '@/src/be/modules/reviews/reviews.moderation'

// PATCH /api/admin/reviews/[id] — { action: 'approve' | 'reject' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('review.moderate')
  if (auth instanceof Response) return auth

  const { id } = await params
  const body = await parseBody<{ action?: string }>(req)
  const action = body?.action

  if (action !== 'approve' && action !== 'reject') {
    return errorResponse('action phải là "approve" hoặc "reject"', 400)
  }

  try {
    if (action === 'approve') {
      await approveReview(id)
    } else {
      await rejectReview(id)
    }
  } catch {
    return errorResponse('Không tìm thấy đánh giá hoặc xử lý thất bại', 404)
  }

  await logAdminAction({
    actorId: auth.user.id,
    action: action === 'approve' ? 'review.approve' : 'review.reject',
    targetType: 'review',
    targetId: id,
    ipAddress: getClientIp(req.headers),
  }).catch(() => {})

  return successResponse({ ok: true, id, status: action === 'approve' ? 'approved' : 'rejected' })
}
