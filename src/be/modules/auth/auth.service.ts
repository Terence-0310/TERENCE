// ============================================
// Auth Module — Service
// ============================================

import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import * as AuthRepository from './auth.repository'
import { generateToken, sendVerificationEmail } from '@/lib/mail'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'auth-service' })

const SALT_ROUNDS = 12
const SESSION_COOKIE = 'terence_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface PublicUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
}

export const AuthService = {
  // ── Password ──────────────────────────────
  /**
   * Hashes a plain text password using bcrypt.
   * 
   * @param password - The plain text password to hash
   * @returns The hashed password string
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  },

  /**
   * Verifies a plain text password against a hashed password.
   * 
   * @param password - The plain text password
   * @param hash - The hashed password stored in the database
   * @returns True if the password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  },

  // ── Session ───────────────────────────────
  /**
   * Creates a new user session, invalidates expired ones, and sets a cookie.
   * 
   * @param userId - The ID of the user to create a session for
   * @returns The generated session ID
   */
  async createSession(userId: string): Promise<string> {
    await AuthRepository.deleteExpiredSessions(userId)
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE)
    const session = await AuthRepository.createSessionRecord(userId, expiresAt)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE / 1000,
    })

    return session.id
  },

  /**
   * Finds a session by ID and verifies if it is still valid.
   * Invalidates the session if it has expired.
   * 
   * @param sessionId - The session ID to check
   * @returns The valid session object or null if invalid/expired
   */
  async findValidSession(sessionId: string) {
    const session = await AuthRepository.findSessionById(sessionId)
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await AuthRepository.deleteSessionRecord(sessionId)
      return null
    }
    return session
  },

  /**
   * Retrieves the current session from cookies or authorization header.
   * 
   * @returns The current valid session or null if not authenticated
   */
  async getSession() {
    // 1. Cookie
    const cookieStore = await cookies()
    const cookieSessionId = cookieStore.get(SESSION_COOKIE)?.value
    if (cookieSessionId) {
      return this.findValidSession(cookieSessionId)
    }

    // 2. Fallback Bearer header
    try {
      const headerStore = await headers()
      const authHeader = headerStore.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim()
        if (token) return this.findValidSession(token)
      }
    } catch {
      // ignores headers() failure inside middleware occasionally
    }
    return null
  },

  /**
   * Deletes the current active session and removes the session cookie.
   */
  async deleteSession() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value
    if (sessionId) {
      await AuthRepository.deleteSessionRecord(sessionId)
    }
    cookieStore.delete(SESSION_COOKIE)
  },

  /**
   * Extracts the session ID from a raw cookie string.
   * 
   * @param cookieHeader - The raw cookie header string
   * @returns The extracted session ID or null
   */
  getSessionIdFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null
    const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`))
    return match ? match.split('=')[1]?.trim() || null : null
  },

  // ── Current User ──────────────────────────
  /**
   * Retrieves the currently authenticated user based on session or NextAuth.
   * 
   * @returns The public user profile or null if not authenticated
   */
  async getCurrentUser(): Promise<PublicUser | null> {
    // 1. Try NextAuth JWT token directly from cookies (Next.js 16 compatible)
    try {
      const cookieStore = await cookies()
      const isSecure = !!cookieStore.get('__Secure-next-auth.session-token')
      const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
      const sessionToken = cookieStore.get(cookieName)?.value

      if (sessionToken) {
        const { getToken } = await import('next-auth/jwt')
        const mockReq = new Request('http://localhost', {
          headers: { cookie: `${cookieName}=${sessionToken}` },
        })
        // TS: getToken's req type is the Node IncomingMessage / NextRequest union; a plain Request works at runtime when cookie header is set.
        const token = await getToken({
          req: mockReq as unknown as Parameters<typeof getToken>[0]['req'],
          secret: process.env.NEXTAUTH_SECRET,
        })
        if (token) {
          // Token is read straight from the cookie (no jwt callback), so
          // re-check the account here too — blocked users lose access at once.
          const userId = (token.id as string) || (token.sub as string) || ''
          const { getAccountStatus } = await import('./account-status')
          const status = userId ? await getAccountStatus(userId).catch(() => undefined) : null
          if (status === null || status?.active === false) return null
          return {
            id: userId,
            email: (token.email as string) || '',
            name: (token.name as string) || '',
            role: (token.role as string) || 'USER',
            avatar: (token.picture as string) || null,
          }
        }
      }
    } catch {
      // fall through to getServerSession
    }

    // 2. Fallback: getServerSession (may not work reliably in Next.js 16)
    try {
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('@/lib/auth');
      const nextSession = await getServerSession(authOptions);
      if (nextSession?.user) {
        return {
          id: nextSession.user.id || '',
          email: nextSession.user.email || '',
          name: nextSession.user.name || '',
          role: nextSession.user.role || 'USER',
          avatar: nextSession.user.image || null,
        }
      }
    } catch {
      // ignore
    }

    // 2. Fallback to custom session cookie (legacy)
    const session = await this.getSession()
    if (!session || !session.user.isActive) return null

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      avatar: session.user.avatar,
    }
  },

  // ── Verification ──────────────────────────
  async triggerEmailVerification(email: string, name: string): Promise<boolean> {
    try {
      await AuthRepository.deleteVerificationTokensByIdentifier(email)
      const token = generateToken()
      // Token valid for 24h
      await AuthRepository.createVerificationToken(email, token, new Date(Date.now() + 24 * 60 * 60 * 1000))
      await sendVerificationEmail(email, token, name)
      return true
    } catch (e) {
      log.error({ err: e instanceof Error ? e.message : e }, 'Failed to trigger email verification')
      return false
    }
  }
}

