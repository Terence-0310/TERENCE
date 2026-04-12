// GET /api/admin/tcoin/payments?page=1&perPage=20&status=...
// Admin: list all payment orders

import { NextRequest, NextResponse } from 'next/server'
import { getAdminPaymentOrders } from '@/src/be/modules/tcoin/tcoin.service'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin('payment.read')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const perPage = Math.min(Number(searchParams.get('perPage')) || 20, 50)
  const status = searchParams.get('status') || undefined

  const result = await getAdminPaymentOrders(page, perPage, status)
  return NextResponse.json(result)
}
