import { NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập để bình luận' }, { status: 401 })
    }

    const { movieId, rating, content, isSpoiler } = await req.json()
    if (!movieId || !rating) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin đánh giá' }, { status: 400 })
    }

    // Check if user already reviewed
    const existing = await prisma.review.findUnique({
      where: {
        userId_movieId: { userId, movieId }
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, error: 'Bạn đã đánh giá bộ phim này rồi' }, { status: 400 })
    }

    // Check if this is their first ever review to give TCoin!
    const userReviewCount = await prisma.review.count({ where: { userId } })
    const isFirstReview = userReviewCount === 0

    const review = await prisma.review.create({
      data: {
        userId,
        movieId,
        rating: Number(rating),
        content,
        isSpoiler: Boolean(isSpoiler),
        status: 'approved', // Auto-approve for demo
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      }
    })

    // TCoin Logic
    let tcoinRewarded = false
    if (isFirstReview) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } })
      if (wallet) {
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: 50 } }
        })
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: 'REWARD',
            direction: 'CREDIT',
            amount: 50,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance + 50,
            status: 'SUCCESS',
            title: 'Viết review phim đầu tiên'
          }
        })
        tcoinRewarded = true
      }
    }

    return NextResponse.json({ 
      success: true, 
      tcoinRewarded,
      data: {
        id: review.id,
        author: review.user.name,
        avatar: review.user.avatar,
        text: review.content,
        rating: review.rating,
        date: new Date(review.createdAt).toLocaleString('vi-VN'),
        createdAt: review.createdAt,
        isSpoiler: review.isSpoiler,
        likeCount: review.likeCount,
      } 
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
