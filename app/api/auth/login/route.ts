import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { logAdminAction, getClientIp } from '@/lib/admin/audit'
import { rateLimit, getClientIdentifier } from '@/lib/api/rate-limit'

// Rate limit: 5 login attempts per minute per IP
const loginLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const clientId = getClientIdentifier(req)
    const limitResult = loginLimiter.check(clientId)
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const sessionId = await createSession(user.id)

    // Log admin login
    const isAdmin = ['super_admin', 'admin', 'staff', 'editor'].includes(user.role)
    if (isAdmin) {
      await logAdminAction({
        actorId: user.id,
        action: 'login',
        targetType: 'system',
        metadata: { role: user.role, email: user.email },
        ipAddress: getClientIp(req.headers),
      })
    }

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
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
