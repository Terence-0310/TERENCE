import { cookies } from 'next/headers'
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

export async function getSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

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
