import { NextRequest } from 'next/server'
import { expireStaleOrders } from '@/src/be/services/topup-order.service'
import { ok, serverError, unauthorized } from '@/src/be/shared/api-handler'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'cron-expire-orders' })

// ----------------------------------------------------------------------
// POST /api/cron/expire-orders
// Chạy tự động (Cron Job) để kiểm tra và huỷ các đơn nạp tiền đã quá hạn.
// Endpoint này có thể được gọi bởi Vercel Cron hoặc crontab hệ thống.
// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  return executeCron(req)
}

export async function GET(req: NextRequest) {
  // Support GET cho một số Cron service chỉ gọi GET
  return executeCron(req)
}

async function executeCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Bảo mật: Nếu có cài đặt CRON_SECRET trong .env, bắt buộc phải truyền đúng API Key
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized('Invalid Cron Secret')
  }

  try {
    const result = await expireStaleOrders()
    return ok({ 
      success: true, 
      expiredCount: result.count, 
      message: `Đã huỷ ${result.count} đơn hàng quá hạn 15 phút.` 
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Lỗi huỷ đơn hàng quá hạn')
    return serverError('Failed to expire orders')
  }
}
