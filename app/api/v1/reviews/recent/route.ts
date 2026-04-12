import { NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        movie: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const res = NextResponse.json({ success: true, data: reviews })
    res.headers.set('Content-Type', 'application/json; charset=utf-8')
    return res
  } catch (error: any) {
    const errRes = NextResponse.json({ success: false, error: error.message }, { status: 500 })
    errRes.headers.set('Content-Type', 'application/json; charset=utf-8')
    return errRes
  }
}
