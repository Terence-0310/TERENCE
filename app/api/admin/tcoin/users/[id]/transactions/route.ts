// GET /api/admin/tcoin/users/[id]/transactions?page=1&perPage=20
// Admin: list a single user's wallet transactions (with metadata decrypted).
// Backs the "Lịch sử & Hoàn tiền" modal in the admin TCoin dashboard.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'
import { prisma } from '@/src/be/shared/db/prisma'
import { decryptMetadata } from '@/src/be/shared/utils/encryption'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin('payment.read')
  if (auth instanceof NextResponse) return auth

  const { id: userId } = await params
  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage')) || 20))
  const skip = (page - 1) * perPage

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ])

  // Mark transactions that already have a corresponding REFUND so the UI can
  // disable the "Hoàn tiền" button. Done in a single roundtrip rather than
  // a per-row query.
  const debitIds = rows
    .filter((r) => r.direction.toLowerCase() === 'debit')
    .map((r) => r.id)

  const existingRefunds = debitIds.length
    ? await prisma.walletTransaction.findMany({
        where: { type: 'REFUND', referenceId: { in: debitIds } },
        select: { referenceId: true },
      })
    : []
  const refundedIds = new Set(existingRefunds.map((r) => r.referenceId).filter(Boolean))

  const items = rows.map((tx) => {
    const meta = decryptMetadata(tx.metadata) as Record<string, unknown> | null
    return {
      id: tx.id,
      direction: tx.direction,
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      title: tx.title,
      description: tx.description ?? (meta?.description as string | undefined) ?? null,
      referenceId: tx.referenceId,
      createdAt: tx.createdAt.toISOString(),
      refundable: tx.direction.toLowerCase() === 'debit' && !refundedIds.has(tx.id),
    }
  })

  return NextResponse.json({
    user: { id: userId, name: wallet.user.name, email: wallet.user.email },
    balance: wallet.balance,
    items,
    total,
    page,
    perPage,
  })
}
