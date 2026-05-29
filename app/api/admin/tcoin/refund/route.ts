import { NextRequest } from 'next/server'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'
import { adminRefund } from '@/src/be/modules/tcoin/tcoin.service'
import { ok, badRequest, serverError, parseAndValidate } from '@/src/be/shared/api-handler'
import { z } from 'zod'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-tcoin-refund' })

const refundSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  reason: z.string().min(5, 'Lý do hoàn tiền phải có ít nhất 5 ký tự'),
})

export async function POST(req: NextRequest) {
  try {
    const authRes = await requireAdmin()
    if (authRes instanceof Response) return authRes // 401/403

    const adminId = authRes.user.id

    const validation = await parseAndValidate(req, refundSchema)
    if (validation.error) return validation.error

    const { transactionId, reason } = validation.data

    const result = await adminRefund(transactionId, reason, adminId)
    if (!result.ok) {
      return badRequest(result.message || 'Lỗi hoàn tiền')
    }

    return ok({ success: true, transaction: result.transaction, message: 'Hoàn tiền thành công' })
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error.message : error }, 'POST /api/admin/tcoin/refund error')
    return serverError('Đã xảy ra lỗi khi hoàn tiền')
  }
}
