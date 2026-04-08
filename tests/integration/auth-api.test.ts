// ============================================
// Integration Tests — Auth API Routes
// ============================================
// Tests login/signup route handlers with fully mocked DB & session.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'

// ── Hoisted mocks ──
const { mockPrisma, mockCreateSession } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  mockCreateSession: vi.fn().mockResolvedValue('session-id-123'),
}))

vi.mock('@/lib/auth/db', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/auth/session', () => ({
  createSession: mockCreateSession,
  getSessionIdFromCookie: vi.fn(),
}))
vi.mock('@/lib/admin/audit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({
    check: () => ({ allowed: true, remaining: 10, resetMs: Date.now() + 60000 }),
  }),
  getClientIdentifier: () => 'test-ip',
}))

import { POST as loginRoute } from '@/app/api/auth/login/route'
import { POST as signupRoute } from '@/app/api/auth/signup/route'
import { hashPassword } from '@/lib/auth/password'

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 400 for missing email/password', async () => {
    const req = createMockRequest('/api/auth/login', { method: 'POST', body: {} })
    const res = await loginRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toContain('bắt buộc')
  })

  it('should return 401 for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const req = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexist@test.com', password: 'password123' },
    })
    const res = await loginRoute(req)
    const { status } = await parseResponse(res)
    expect(status).toBe(401)
  })

  it('should return 403 for inactive user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'test@test.com', isActive: false, passwordHash: 'hash', role: 'user',
    })

    const req = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@test.com', password: 'password123' },
    })
    const res = await loginRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)
    expect(status).toBe(403)
    expect(body.error).toContain('vô hiệu hóa')
  })

  it('should return 401 for wrong password', async () => {
    const hash = await hashPassword('correct-password')
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'test@test.com', isActive: true, passwordHash: hash, role: 'user',
    })

    const req = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@test.com', password: 'wrong-password' },
    })
    const res = await loginRoute(req)
    const { status } = await parseResponse(res)
    expect(status).toBe(401)
  })

  it('should return user on correct login', async () => {
    const hash = await hashPassword('correct-password')
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'test@test.com', name: 'Test User',
      isActive: true, passwordHash: hash, role: 'user', avatar: null,
    })

    const req = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@test.com', password: 'correct-password' },
    })
    const res = await loginRoute(req)
    const { status, body } = await parseResponse<{ user: { email: string; role: string } }>(res)

    expect(status).toBe(200)
    expect(body.user.email).toBe('test@test.com')
    expect(body.user.role).toBe('user')
    expect(mockCreateSession).toHaveBeenCalledWith('u1')
  })
})

describe('POST /api/auth/signup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 400 for missing fields', async () => {
    const req = createMockRequest('/api/auth/signup', { method: 'POST', body: { name: 'Test' } })
    const res = await signupRoute(req)
    const { status } = await parseResponse(res)
    expect(status).toBe(400)
  })

  it('should return 400 for short password', async () => {
    const req = createMockRequest('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Test', email: 'test@test.com', password: '1234567' },
    })
    const res = await signupRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toContain('8 ký tự')
  })

  it('should return 409 for existing email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })

    const req = createMockRequest('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Test', email: 'exist@test.com', password: '12345678' },
    })
    const res = await signupRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)
    expect(status).toBe(409)
    expect(body.error).toContain('đã được sử dụng')
  })

  it('should create user and return profile on success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user', name: 'Test', email: 'new@test.com', role: 'user', avatar: null,
    })

    const req = createMockRequest('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Test', email: 'new@test.com', password: '12345678' },
    })
    const res = await signupRoute(req)
    const { status, body } = await parseResponse<{ user: { email: string; role: string } }>(res)

    expect(status).toBe(200)
    expect(body.user.email).toBe('new@test.com')
    expect(body.user.role).toBe('user')
    expect(mockCreateSession).toHaveBeenCalledWith('new-user')
  })

  it('should lowercase and trim email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1', name: 'Test', email: 'test@test.com', role: 'user', avatar: null,
    })

    const req = createMockRequest('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Test', email: '  TEST@Test.COM  ', password: '12345678' },
    })
    await signupRoute(req)

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@test.com' },
    })
  })
})
