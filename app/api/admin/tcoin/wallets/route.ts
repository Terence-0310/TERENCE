// GET /api/admin/tcoin/wallets?page=1&perPage=20&search=...
// Admin: list all wallets with aggregates. Accepts server-side search across
// the joined user's name + email (case-insensitive). Returns global stats
// alongside the page so the dashboard never has to sum partial pages.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminWallets, getAdminGlobalStats } from '@/src/be/modules/tcoin/tcoin.service'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin('payment.read')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const perPage = Math.min(Number(searchParams.get('perPage')) || 20, 50)
  const search = searchParams.get('search') || undefined

  const [result, stats] = await Promise.all([
    getAdminWallets(page, perPage, search),
    getAdminGlobalStats(),
  ])
  return NextResponse.json({ ...result, stats })
}
