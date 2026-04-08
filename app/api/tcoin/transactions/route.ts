// GET /api/tcoin/transactions?page=1&perPage=20&category=...
// Returns paginated transaction history

import { NextRequest, NextResponse } from 'next/server'
import { getTransactions } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const perPage = Math.min(Number(searchParams.get('perPage')) || 20, 50)
  const category = searchParams.get('category') || undefined

  const result = await getTransactions(session.userId, page, perPage, category)
  return NextResponse.json(result)
}
