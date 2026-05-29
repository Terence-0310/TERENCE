// ============================================
// Auth Module — Controller
// ============================================
// HTTP request/response handling for auth endpoints.
// Validates input, calls service, returns NextResponse.

import { NextResponse } from 'next/server'
import * as AuthRepository from './auth.repository'
import { AuthService } from './auth.service'
import { loginSchema, signupSchema, resendVerifySchema } from './auth.schema'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'auth-controller' })

export async function login(body: unknown, headers?: Headers) {
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Email và mật khẩu là bắt buộc' },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data

  const user = await AuthRepository.findUserByEmail(email)
  if (!user) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
  }

  if (!user.isActive) {
    return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 })
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập qua Google' }, { status: 400 })
  }

  const valid = await AuthService.verifyPassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
  }

  await AuthService.createSession(user.id)

  // Log admin login
  const isAdmin = ['super_admin', 'admin', 'staff', 'editor'].includes(user.role.toLowerCase())
  if (isAdmin && headers) {
    await logAdminAction({
      actorId: user.id,
      action: 'login',
      targetType: 'system',
      metadata: { role: user.role, email: user.email },
      ipAddress: getClientIp(headers),
    })
  }

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
  })
}

export async function signup(body: unknown) {
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0] || 'Dữ liệu không hợp lệ'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { email, password, name, referralCode } = parsed.data

  const existing = await AuthRepository.findUserByEmail(email)
  if (existing) {
    return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
  }

  const passwordHash = await AuthService.hashPassword(password)
  const user = await AuthRepository.createUser({ email, name, passwordHash })

  // Trigger verification email asynchronously (fire-and-forget)
  AuthService.triggerEmailVerification(user.email, user.name)

  // Credit the inviter if a valid referral code was passed. Verified
  // asynchronously so signup latency stays low; the reward function is
  // idempotent on (inviter, invitee) so a duplicate trigger is harmless.
  if (referralCode && referralCode !== user.id) {
    void (async () => {
      try {
        const inviter = await AuthRepository.findUserById(referralCode)
        if (!inviter) return
        const { rewardInvite } = await import('@/src/be/modules/tcoin/tcoin.service')
        await rewardInvite(inviter.id, user.id)
      } catch {
        /* silent — referral credit is best-effort */
      }
    })()
  }

  await AuthService.createSession(user.id)

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
    message: 'Tạo tài khoản thành công! Bạn có thể trải nghiệm ngay và xác thực Email sau từ màn hình trang cá nhân.',
  })
}

export async function logout() {
  await AuthService.deleteSession()
  return NextResponse.json({ success: true })
}

export async function me() {
  const user = await AuthService.getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user })
}

export async function verifyEmail(token: string | null) {
  if (!token) {
    return NextResponse.json({ error: 'Token xác thực không hợp lệ' }, { status: 400 })
  }

  const record = await AuthRepository.findVerificationToken(token)
  if (!record) {
    return NextResponse.json({ error: 'Token không tồn tại hoặc đã được sử dụng' }, { status: 400 })
  }

  if (record.expires < new Date()) {
    await AuthRepository.deleteVerificationToken(record.identifier, token)
    return NextResponse.json({ error: 'Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.' }, { status: 400 })
  }

  const user = await AuthRepository.findUserByEmail(record.identifier)
  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
  }

  if (user.isEmailVerified) {
    await AuthRepository.deleteVerificationToken(record.identifier, token)
    return NextResponse.json({ message: 'Email đã được xác thực trước đó', alreadyVerified: true })
  }

  await AuthRepository.verifyUserEmail(user.id)
  await AuthRepository.deleteVerificationToken(record.identifier, token)

  // Reward TCoin lần đầu xác minh email (idempotent — không lỗi nếu đã credit)
  try {
    const { rewardVerifyEmail } = await import('@/src/be/modules/tcoin/tcoin.service')
    await rewardVerifyEmail(user.id)
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'verifyEmail reward TCoin failed')
  }

  return NextResponse.json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay.' })
}

export async function resendVerificationEmail(body: unknown) {
  const parsed = resendVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Email không hợp lệ' }, { status: 400 })
  }
  const { email } = parsed.data

  const user = await AuthRepository.findUserByEmail(email)
  if (!user) {
    return NextResponse.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link xác thực.' })
  }

  if (user.isEmailVerified) {
    return NextResponse.json({ message: 'Email đã được xác thực', alreadyVerified: true })
  }

  const success = await AuthService.triggerEmailVerification(user.email, user.name)
  if (!success) {
    return NextResponse.json({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Đã gửi email xác thực. Vui lòng kiểm tra hộp thư.' })
}
