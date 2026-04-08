import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { hashPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { rateLimit, getClientIdentifier } from '@/lib/api/rate-limit'

// Rate limit: 5 signup attempts per minute per IP
const signupLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const clientId = getClientIdentifier(req)
    const limitResult = signupLimiter.check(clientId)
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần đăng ký, vui lòng thử lại sau' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { name, email, password } = body as { name?: string; email?: string; password?: string }

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Tất cả các trường là bắt buộc' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'user',
        isActive: true,
      },
    })

    const sessionId = await createSession(user.id)

    return NextResponse.json({
      token: sessionId,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
