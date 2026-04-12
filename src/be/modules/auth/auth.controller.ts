// ============================================
// Auth Module — Controller
// ============================================
// HTTP request/response handling for auth endpoints.
// Validates input, calls service, returns NextResponse.

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import * as AuthRepository from './auth.repository'
import { AuthService } from './auth.service'
import { loginSchema, signupSchema } from './auth.schema'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'

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
  const isAdmin = ['super_admin', 'admin', 'staff', 'editor'].includes(user.role)
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

  const { email, password, name } = parsed.data

  const existing = await AuthRepository.findUserByEmail(email)
  if (existing) {
    return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
  }

  const passwordHash = await AuthService.hashPassword(password)
  const user = await AuthRepository.createUser({ email, name, passwordHash })
  await AuthService.createSession(user.id)

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
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
