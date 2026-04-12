// GET /api/admin/tcoin/wallets?page=1&perPage=20
// Admin: list all wallets with aggregates

import { NextRequest, NextResponse } from 'next/server'
import { getAdminWallets } from '@/src/be/modules/tcoin/tcoin.service'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin('payment.read')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const perPage = Math.min(Number(searchParams.get('perPage')) || 20, 50)

  const result = await getAdminWallets(page, perPage)
  return NextResponse.json(result)
}
