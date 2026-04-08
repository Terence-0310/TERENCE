// POST /api/payments/create-order
// Creates a payment order for TCoin purchase

import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrder } from '@/src/server/modules/tcoin/tcoin.service'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { packageId } = body
  if (!packageId) {
    return NextResponse.json({ error: 'packageId is required' }, { status: 400 })
  }

  try {
    const result = await createPurchaseOrder(session.userId, packageId)
    return NextResponse.json(result)
  } catch (e: any) {
    if (e.message === 'INVALID_PACKAGE') {
      return NextResponse.json({ error: 'Gói nạp không hợp lệ' }, { status: 400 })
    }
    throw e
  }
}
