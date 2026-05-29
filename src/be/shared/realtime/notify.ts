// ============================================
// Server-side realtime broadcast helpers
// ============================================
// server.ts stores the SocketIOServer instance on `globalThis._io`, so any
// server module (services, webhooks, route handlers) can push events
// without an import cycle. We expose three target shapes:
//
//   • per-user  → `user:<id>`            (joined via `user:identify`)
//   • admin     → `admin:dashboard`      (joined via `admin:join`)
//   • global    → no room (everyone)     (use sparingly)
//
// All emits no-op when the IO server isn't ready (e.g. during tests or
// when running plain `next dev` without the custom server). Never throw.

import type { Server as SocketIOServer } from 'socket.io'

type GlobalWithIO = typeof globalThis & { _io?: SocketIOServer }

export function getIo(): SocketIOServer | null {
  return (globalThis as GlobalWithIO)._io ?? null
}

// ─── Room name helpers ──────────────────────────────────────────────

export function userRoom(userId: string): string {
  return `user:${userId}`
}

export const ADMIN_ROOM = 'admin:dashboard'

export function watchPartyRoom(roomCode: string): string {
  // Matches the room name used by registerWatchPartyHandlers in
  // src/be/modules/watch-party/watch-party.socket.ts so emissions from
  // service-layer code land in the same room participants joined.
  return roomCode
}

// ─── Event names ────────────────────────────────────────────────────
// Centralised so client + server never drift. If you rename one here,
// search-and-replace catches both sides.

export const RT_EVENTS = {
  // TCoin
  TCOIN_UPDATED: 'tcoin:updated',
  TCOIN_TX_NEW:  'tcoin:transaction:new',
  TASK_CLAIMED:  'task:claimed',
  REWARD_REDEEMED: 'reward:redeemed',
  TCOIN_PAID:    'tcoin:paid', // existing — payment webhook

  // Watch progress (per-user, multi-tab sync)
  WATCH_PROGRESS: 'watch:progress',
  WATCH_COMPLETED: 'watch:completed',

  // Ads (broadcast)
  ADS_CREATED: 'ads:created',
  ADS_UPDATED: 'ads:updated',
  ADS_DELETED: 'ads:deleted',

  // Admin dashboard
  DASH_STATS:  'dashboard:stats',
  USERS_ONLINE: 'users:online',

  // Watch party + Ads
  ROOM_AD_START: 'room:ad:start',
  ROOM_AD_SYNC:  'room:ad:sync',
  ROOM_AD_END:   'room:ad:end',
} as const

// ─── Emit helpers ───────────────────────────────────────────────────

function safeEmit(target: 'user' | 'admin' | 'all' | 'room', key: string | null, event: string, payload: unknown): boolean {
  const io = getIo()
  if (!io) return false
  try {
    switch (target) {
      case 'user':
        if (!key) return false
        io.to(userRoom(key)).emit(event, payload)
        return true
      case 'admin':
        io.to(ADMIN_ROOM).emit(event, payload)
        return true
      case 'room':
        if (!key) return false
        io.to(key).emit(event, payload)
        return true
      case 'all':
        io.emit(event, payload)
        return true
    }
  } catch {
    return false
  }
}

export function notifyUser(userId: string, event: string, payload: unknown): boolean {
  if (!userId) return false
  return safeEmit('user', userId, event, payload)
}

export function notifyAdmins(event: string, payload: unknown): boolean {
  return safeEmit('admin', null, event, payload)
}

export function notifyAll(event: string, payload: unknown): boolean {
  return safeEmit('all', null, event, payload)
}

export function notifyRoom(roomKey: string, event: string, payload: unknown): boolean {
  if (!roomKey) return false
  return safeEmit('room', roomKey, event, payload)
}

// ─── Online users tracking ──────────────────────────────────────────
// Counts unique authenticated userIds currently identified. We rely
// on `user:identify` / disconnect to mutate this set — see
// src/be/shared/realtime/socket-handlers.ts.

const onlineUsers = new Map<string, Set<string>>() // userId -> set of socketIds

export function trackOnline(userId: string, socketId: string) {
  if (!userId) return
  let set = onlineUsers.get(userId)
  if (!set) { set = new Set(); onlineUsers.set(userId, set) }
  set.add(socketId)
}

export function untrackOnline(socketId: string) {
  for (const [uid, set] of onlineUsers.entries()) {
    if (set.delete(socketId) && set.size === 0) onlineUsers.delete(uid)
  }
}

export function getOnlineUserCount(): number {
  return onlineUsers.size
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys())
}
