import { cookies, headers } from 'next/headers'
import { prisma } from './db'

const SESSION_COOKIE = 'terence_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createSession(userId: string): Promise<string> {
  // Clean up expired sessions for this user
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  })

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE),
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE / 1000,
  })

  return session.id
}

// ── Internal: validate a session ID against DB ──
async function findValidSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } })
    return null
  }

  return session
}

/**
 * Get current session — supports TWO authentication methods:
 *
 * 1. Cookie: `terence_session=<sessionId>` (used by Frontend/Browser)
 * 2. Bearer Token: `Authorization: Bearer <sessionId>` (used by Postman/API clients)
 *
 * Cookie is checked first. If no cookie, falls back to Bearer header.
 * The "token" IS the session ID returned from login response.
 */
export async function getSession() {
  // 1. Try cookie first (Frontend / Browser)
  const cookieStore = await cookies()
  const cookieSessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (cookieSessionId) {
    return findValidSession(cookieSessionId)
  }

  // 2. Fallback: Authorization Bearer header (Postman / API clients)
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        return findValidSession(token)
      }
    }
  } catch {
    // headers() may fail in some contexts — ignore
  }

  return null
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
  }
  cookieStore.delete(SESSION_COOKIE)
}

/** Read session cookie value without cookies() — for middleware */
export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`))
  return match ? match.split('=')[1]?.trim() || null : null
}
