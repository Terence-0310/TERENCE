// ============================================
// Auth Module — Service
// ============================================

import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import * as AuthRepository from './auth.repository'

const SALT_ROUNDS = 12
const SESSION_COOKIE = 'terence_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface PublicUser {
  email: string
  name: string
  role: string
  avatar?: string | null
}

export const AuthService = {
  // ── Password ──────────────────────────────
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  },

  // ── Session ───────────────────────────────
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

  async findValidSession(sessionId: string) {
    const session = await AuthRepository.findSessionById(sessionId)
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await AuthRepository.deleteSessionRecord(sessionId)
      return null
    }
    return session
  },

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

  async deleteSession() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value
    if (sessionId) {
      await AuthRepository.deleteSessionRecord(sessionId)
    }
    cookieStore.delete(SESSION_COOKIE)
  },

  getSessionIdFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null
    const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`))
    return match ? match.split('=')[1]?.trim() || null : null
  },

  // ── Current User ──────────────────────────
  async getCurrentUser(): Promise<PublicUser | null> {
    // 1. Try NextAuth session first (primary)
    try {
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('@/lib/auth');
      const nextSession = await getServerSession(authOptions);
      if (nextSession?.user) {
        return {
          email: nextSession.user.email || '',
          name: nextSession.user.name || '',
          role: (nextSession.user as any).role || 'USER',
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
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      avatar: session.user.avatar,
    }
  }
}

