// GET /api/admin/tcoin/payments?page=1&perPage=20&status=...
// Admin: list all payment orders

import { NextRequest, NextResponse } from 'next/server'
import { getAdminPaymentOrders } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const perPage = Math.min(Number(searchParams.get('perPage')) || 20, 50)
  const status = searchParams.get('status') || undefined

  const result = await getAdminPaymentOrders(page, perPage, status)
  return NextResponse.json(result)
}
