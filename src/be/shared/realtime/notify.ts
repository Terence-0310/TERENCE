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

  // Reviews / comments (per-movie room)
  REVIEW_CREATED: 'review:created',
  REVIEW_LIKED:   'review:liked',

  // User notifications (per-user room)
  NOTIFICATION_NEW: 'notification:new',

  // Live viewer presence
  MOVIE_VIEWERS: 'movie:viewers',   // per-movie room: { movieId, count }
  TOPVIEW_STATS: 'topview:stats',   // topview room: live most-watched list

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

// ─── Live viewer presence (per movie) ───────────────────────────────
// Tracks which sockets are actively on a movie's watch page. Powers the
// "X người đang xem" badge and the realtime Top View leaderboard. A socket
// can only be in one movie at a time on the watch page, but we store a
// reverse index too so disconnect cleanup is O(1)-ish.

const movieViewers = new Map<string, Set<string>>()   // movieId -> socketIds
const socketMovie = new Map<string, string>()          // socketId -> movieId

export function addViewer(movieId: string, socketId: string): void {
  if (!movieId || !socketId) return
  // If this socket was viewing another movie, drop it there first.
  const prev = socketMovie.get(socketId)
  if (prev && prev !== movieId) removeViewerFromMovie(prev, socketId)
  let set = movieViewers.get(movieId)
  if (!set) { set = new Set(); movieViewers.set(movieId, set) }
  set.add(socketId)
  socketMovie.set(socketId, movieId)
}

export function removeViewerFromMovie(movieId: string, socketId: string): void {
  const set = movieViewers.get(movieId)
  if (set && set.delete(socketId) && set.size === 0) movieViewers.delete(movieId)
  if (socketMovie.get(socketId) === movieId) socketMovie.delete(socketId)
}

/** Remove a socket from whatever movie it was viewing. Returns that movieId. */
export function removeViewerSocket(socketId: string): string | null {
  const movieId = socketMovie.get(socketId) ?? null
  if (movieId) removeViewerFromMovie(movieId, socketId)
  return movieId
}

export function getMovieViewerCount(movieId: string): number {
  return movieViewers.get(movieId)?.size ?? 0
}

/** Top N movies by current live viewers, descending. */
export function getTopViewedMovies(n = 10): Array<{ movieId: string; count: number }> {
  return Array.from(movieViewers.entries())
    .map(([movieId, set]) => ({ movieId, count: set.size }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
