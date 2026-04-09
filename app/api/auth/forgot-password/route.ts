import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body as { email?: string }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      // Vẫn trả về success để tránh dò rỉ email (email enumeration)
      return NextResponse.json({ message: 'Trường hợp email hợp lệ, link khôi phục đã được gửi' })
    }

    // Xóa các token cũ của user đang chờ
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Generate token mới (độ dài 32 bytes)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // Het han sau 1 tieng

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Send the email using the configured SMTP setup
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ 
      message: 'Trường hợp email hợp lệ, link khôi phục đã được gửi',
      ...(process.env.NODE_ENV !== 'production' && { devToken: token }) 
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
