// ============================================
// Integration Tests — Auth API Routes
// ============================================
// Tests: POST /api/auth/register, GET/POST /api/auth/verify-email

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'
import { createMockPrisma, type MockPrisma } from '@/tests/helpers/mock-prisma'

// ── Mock dependencies ──
let mockPrisma: MockPrisma

const { mockHashPassword } = vi.hoisted(() => ({
  mockHashPassword: vi.fn().mockResolvedValue('hashed_password_123'),
}))

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/modules/auth', () => ({
  AuthService: {
    hashPassword: mockHashPassword,
  }
}))

vi.mock('@/lib/mail', () => ({
  generateToken: vi.fn().mockReturnValue('mock-verification-token-abc123'),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

import { POST as registerRoute } from '@/app/api/auth/register/route'
import { GET as verifyEmailGET, POST as verifyEmailPOST } from '@/app/api/auth/verify-email/route'

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
  })

  it('should return 400 when name is missing', async () => {
    const req = createMockRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'test@example.com', password: '123456' },
    })
    const res = await registerRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toBeTruthy()
  })

  it('should return 400 when email is invalid', async () => {
    const req = createMockRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test', email: 'not-an-email', password: '123456' },
    })
    const res = await registerRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('Email')
  })

  it('should return 400 when password is too short', async () => {
    const req = createMockRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test', email: 'test@example.com', password: '12345' },
    })
    const res = await registerRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('6')
  })

  it('should return 400 when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: 'test@example.com' })

    const req = createMockRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test', email: 'test@example.com', password: '123456' },
    })
    const res = await registerRoute(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('Email')
  })

  it('should create user and send verification email on success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null) // No existing user
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-1', name: 'Test User', email: 'test@example.com', role: 'USER',
    })

    const req = createMockRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test User', email: 'test@example.com', password: 'secure123' },
    })
    const res = await registerRoute(req)
    const { status, body } = await parseResponse<{ user: any; message: string; emailSent: boolean }>(res)

    expect(status).toBe(200)
    expect(body.user.email).toBe('test@example.com')
    expect(body.message).toBeTruthy()
    expect(mockHashPassword).toHaveBeenCalledWith('secure123')
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'test@example.com',
          isEmailVerified: false,
        }),
      })
    )
    // Verification token should be created
    expect(mockPrisma.verificationToken.create).toHaveBeenCalled()
  })
})

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
  })

  it('should return 400 when token is missing', async () => {
    const req = createMockRequest('/api/auth/verify-email')
    const res = await verifyEmailGET(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(400)
  })

  it('should return 400 when token does not exist', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue(null)

    const req = createMockRequest('/api/auth/verify-email', {
      searchParams: { token: 'invalid-token' },
    })
    const res = await verifyEmailGET(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('Token')
  })

  it('should return 400 when token is expired', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'test@example.com',
      token: 'expired-token',
      expires: new Date(Date.now() - 86400000), // expired 24h ago
    })

    const req = createMockRequest('/api/auth/verify-email', {
      searchParams: { token: 'expired-token' },
    })
    const res = await verifyEmailGET(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toContain('hết hạn')
  })

  it('should verify email successfully with valid token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'test@example.com',
      token: 'valid-token',
      expires: new Date(Date.now() + 86400000), // valid for 24h
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', isEmailVerified: false,
    })

    const req = createMockRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    })
    const res = await verifyEmailGET(req)
    const { status, body } = await parseResponse<{ message: string }>(res)

    expect(status).toBe(200)
    expect(body.message).toContain('thành công')
  })
})

describe('POST /api/auth/verify-email (resend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
  })

  it('should return 400 when email is missing', async () => {
    const req = createMockRequest('/api/auth/verify-email', {
      method: 'POST',
      body: {},
    })
    const res = await verifyEmailPOST(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(400)
  })

  it('should return success even for non-existent email (security)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const req = createMockRequest('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'nonexistent@example.com' },
    })
    const res = await verifyEmailPOST(req)
    const { status, body } = await parseResponse<{ message: string }>(res)

    expect(status).toBe(200)
    expect(body.message).toBeTruthy() // Does not reveal email existence
  })

  it('should return already verified for verified users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', name: 'Test', email: 'test@example.com', isEmailVerified: true,
    })

    const req = createMockRequest('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })
    const res = await verifyEmailPOST(req)
    const { status, body } = await parseResponse<{ alreadyVerified: boolean }>(res)

    expect(status).toBe(200)
    expect(body.alreadyVerified).toBe(true)
  })
})
