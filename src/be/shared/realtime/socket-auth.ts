// ============================================
// Socket.IO handshake authentication
// ============================================
// Resolves the user behind a socket from the NextAuth session cookie sent
// with the handshake. Every realtime handler must trust `socket.data.user`
// (set here) instead of any `userId` the client puts in an event payload.
// Anonymous sockets are allowed (live viewer counts, Top View) and simply
// have `socket.data.user === null`.

import type { Socket } from 'socket.io'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'
import { credentialVersionOf } from '@/src/be/modules/auth/account-status'

const log = logger.child({ module: 'socket-auth' })

export interface SocketUser {
  id: string
  role: string
  name: string
}

const SESSION_COOKIE_NAMES = ['__Secure-next-auth.session-token', 'next-auth.session-token']

function parseCookies(header: string | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!header) return map
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    try {
      map.set(key, decodeURIComponent(value))
    } catch {
      map.set(key, value)
    }
  }
  return map
}

/** NextAuth v4 splits large JWTs into `<name>.0`, `<name>.1`, ... cookies. */
function readSessionToken(cookies: Map<string, string>): string | null {
  for (const name of SESSION_COOKIE_NAMES) {
    const whole = cookies.get(name)
    if (whole) return whole
    const chunks: string[] = []
    for (let i = 0; cookies.has(`${name}.${i}`); i++) chunks.push(cookies.get(`${name}.${i}`)!)
    if (chunks.length > 0) return chunks.join('')
  }
  return null
}

/**
 * Decode the NextAuth JWT from the handshake cookies and re-check the user in
 * the DB (so blocked users and role changes take effect immediately).
 */
export async function resolveSocketUser(socket: Socket): Promise<SocketUser | null> {
  const token = readSessionToken(parseCookies(socket.handshake.headers.cookie))
  if (!token || !process.env.NEXTAUTH_SECRET) return null

  try {
    const { decode } = await import('next-auth/jwt')
    const payload = await decode({ token, secret: process.env.NEXTAUTH_SECRET })
    const userId = (payload?.id as string | undefined) || (payload?.sub as string | undefined)
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, isActive: true, passwordHash: true },
    })
    if (!user || !user.isActive) return null
    // Same revocation rule as the NextAuth jwt callback: password changed → session invalid.
    const issuedFor = payload?.credentialVersion as string | undefined
    if (issuedFor && issuedFor !== credentialVersionOf(user.passwordHash)) return null
    return { id: user.id, role: user.role, name: user.name }
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err }, 'Socket session decode failed')
    return null
  }
}

/** The authenticated user for this socket, or null for anonymous sockets. */
export function getSocketUser(socket: Socket): SocketUser | null {
  return (socket.data?.user as SocketUser | null | undefined) ?? null
}
