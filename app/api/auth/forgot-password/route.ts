import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/mail'
import { logger } from '@/src/be/shared/utils/logger'
import { forgotPasswordSchema } from '@/src/be/modules/auth/auth.schema'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'

const log = logger.child({ module: 'auth-forgot-password' })
const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })

export async function POST(req: NextRequest) {
  const { allowed } = await limiter.check(`auth-forgot:${getClientIdentifier(req)}`)
  if (!allowed) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }, { status: 429 })
  }

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = forgotPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Email không hợp lệ' }, { status: 400 })
    }
    const { email } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
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
    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ 
      message: 'Trường hợp email hợp lệ, link khôi phục đã được gửi',
      ...(process.env.NODE_ENV !== 'production' && { devToken: token }) 
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Forgot password error')
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
