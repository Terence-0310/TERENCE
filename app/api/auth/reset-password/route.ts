import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = body as { token?: string, password?: string }

    if (!token?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Token và mật khẩu mới là bắt buộc' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã được sử dụng' }, { status: 400 })
    }

    if (resetToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json({ error: 'Token đã hết hạn' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    // Update password and clean up all reset tokens for this user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword }
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId }
      })
    ])

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
