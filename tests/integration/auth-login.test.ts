import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseResponse } from '@/tests/helpers/mock-request'

const { mockVerifyPassword, mockPrisma, mockCreateSession, mockLogAdminAction } = vi.hoisted(() => {
  return {
    mockVerifyPassword: vi.fn().mockResolvedValue(true),
    mockCreateSession: vi.fn().mockResolvedValue('session-token'),
    mockLogAdminAction: vi.fn().mockResolvedValue(undefined),
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
      }
    }
  }
})

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/modules/auth/auth.service', () => ({
  AuthService: {
    verifyPassword: mockVerifyPassword,
    createSession: mockCreateSession,
  }
}))

vi.mock('@/src/be/modules/admin/audit', () => ({
  logAdminAction: mockLogAdminAction,
  getClientIp: vi.fn().mockReturnValue('127.0.0.1')
}))

import { login } from '@/src/be/modules/auth/auth.controller'

describe('Auth Controller - Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when missing credentials', async () => {
    const res = await login({ email: 'test@example.com' })
    const { status, body } = await parseResponse<{ error: string }>(res)
    
    expect(status).toBe(400)
    expect(body.error).toContain('bắt buộc')
  })

  it('should return 401 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await login({ email: 'wrong@example.com', password: '123' })
    const { status, body } = await parseResponse<{ error: string }>(res)
    
    expect(status).toBe(401)
    expect(body.error).toContain('không đúng')
  })

  it('should return 403 when account is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      isActive: false,
      passwordHash: 'hashed123',
    })

    const res = await login({ email: 'test@example.com', password: '123' })
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(403)
    expect(body.error).toContain('vô hiệu hóa')
  })

  it('should return 400 if user has no password (Google signup)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      isActive: true,
      passwordHash: null,
    })

    const res = await login({ email: 'test@example.com', password: '123' })
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('Google')
  })

  it('should return 401 if password is incorrect', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      isActive: true,
      passwordHash: 'hashed123',
    })
    
    mockVerifyPassword.mockResolvedValueOnce(false)

    const res = await login({ email: 'test@example.com', password: 'wrong_password' })
    const { status, body } = await parseResponse<{ error: string }>(res)
    
    expect(status).toBe(401)
    expect(body.error).toContain('không đúng')
    expect(mockVerifyPassword).toHaveBeenCalledWith('wrong_password', 'hashed123')
  })

  it('should return user object on successful login', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
      passwordHash: 'hashed123',
      role: 'USER',
      avatar: 'avatar.jpg'
    }
    
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValueOnce(true)

    const res = await login({ email: 'test@example.com', password: 'correct_password' })
    const { status, body } = await parseResponse<{ user: any }>(res)

    expect(status).toBe(200)
    expect(mockVerifyPassword).toHaveBeenCalledWith('correct_password', 'hashed123')
    expect(mockCreateSession).toHaveBeenCalledWith('user-1')
    expect(body.user).toEqual({
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      avatar: 'avatar.jpg'
    })
  })
  
  it('should log admin action if user is an admin', async () => {
    const mockAdmin = {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      isActive: true,
      passwordHash: 'hashed123',
      role: 'admin',
      avatar: null
    }
    
    mockPrisma.user.findUnique.mockResolvedValue(mockAdmin)
    mockVerifyPassword.mockResolvedValueOnce(true)

    const headers = new Headers({ 'x-forwarded-for': '127.0.0.1' })
    const res = await login({ email: 'admin@example.com', password: 'admin_password' }, headers)
    const { status } = await parseResponse<{ user: any }>(res)

    expect(status).toBe(200)
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'login',
      actorId: 'admin-1'
    }))
  })
})
