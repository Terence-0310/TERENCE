import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) return NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 404 })

    const stats = {
      watchHistory: await prisma.watchHistory.count({ where: { userId } }),
      reviews: await prisma.review.count({ where: { userId } })
    }

    return NextResponse.json({ user, stats })
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const body = await req.json()
    const { name, bio, avatar } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Tên hiển thị không được để trống' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, bio, avatar },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true }
    })

    return NextResponse.json({ message: 'Cập nhật thành công', user: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi cập nhật thông tin' }, { status: 500 })
  }
}
