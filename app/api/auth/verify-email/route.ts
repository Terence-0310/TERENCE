// ============================================
// Verify Email API — Validates token and marks email verified
// ============================================
// GET  /api/auth/verify-email?token=xxx  — Verify email with token
// POST /api/auth/verify-email             — Resend verification email

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { generateToken, sendVerificationEmail } from '@/lib/mail'

/** GET — Verify email using token from URL */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim()

    if (!token) {
      return NextResponse.json({ error: 'Token xác thực không hợp lệ' }, { status: 400 })
    }

    // Find the verification token
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!record) {
      return NextResponse.json({ error: 'Token không tồn tại hoặc đã được sử dụng' }, { status: 400 })
    }

    if (record.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token } },
      })
      return NextResponse.json({ error: 'Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.' }, { status: 400 })
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
    })

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    if (user.isEmailVerified) {
      // Already verified — clean up token and return success
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token } },
      })
      return NextResponse.json({ message: 'Email đã được xác thực trước đó', alreadyVerified: true })
    }

    // Mark user as verified + clean up token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerified: new Date(),
        },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token } },
      }),
    ])

    return NextResponse.json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay.' })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}

/** POST — Resend verification email */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email as string)?.trim()?.toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Vui lòng cung cấp email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isEmailVerified: true },
    })

    if (!user) {
      // Don't reveal if email exists — return success anyway
      return NextResponse.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link xác thực.' })
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ message: 'Email đã được xác thực', alreadyVerified: true })
    }

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    })

    // Create new token (24h expiry)
    const token = generateToken()
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Send email (fire-and-forget with error logging)
    try {
      await sendVerificationEmail(email, token, user.name)
    } catch (mailError) {
      console.error('Failed to send verification email:', mailError)
      return NextResponse.json({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Đã gửi email xác thực. Vui lòng kiểm tra hộp thư.' })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
