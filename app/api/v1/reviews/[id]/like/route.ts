import { NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const review = await prisma.review.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true }
    })
    return NextResponse.json({ success: true, data: review })
  } catch (error: any) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
