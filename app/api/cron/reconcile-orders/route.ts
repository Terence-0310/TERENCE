import { NextRequest } from 'next/server'
import { reconcilePendingOrders, isSepayApiConfigured } from '@/src/be/modules/payments/sepay-api'
import { ok, serverError, unauthorized } from '@/src/be/shared/api-handler'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'cron-reconcile-orders' })

export const dynamic = 'force-dynamic'

// ----------------------------------------------------------------------
// POST|GET /api/cron/reconcile-orders
// Đối soát chủ động: gọi API SePay để xác nhận các đơn PENDING còn hạn,
// dùng cho trường hợp user đã đóng tab (FE không còn poll) nhưng tiền
// đã về và webhook không tới. Chạy định kỳ qua Cron (PM2/crontab/Vercel).
// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  return executeCron(req)
}

export async function GET(req: NextRequest) {
  return executeCron(req)
}

async function executeCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Cùng quy ước bảo mật với /api/cron/expire-orders.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized('Invalid Cron Secret')
  }

  if (!isSepayApiConfigured()) {
    return ok({
      success: false,
      message: 'SEPAY_API_KEY chưa được cấu hình — bỏ qua đối soát chủ động.',
    })
  }

  try {
    const { checked, confirmed } = await reconcilePendingOrders()
    return ok({
      success: true,
      checked,
      confirmed,
      message: `Đã đối soát ${checked} đơn PENDING, xác nhận ${confirmed} đơn.`,
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Lỗi đối soát đơn hàng')
    return serverError('Failed to reconcile orders')
  }
}
