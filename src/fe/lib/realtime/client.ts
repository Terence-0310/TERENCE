'use client'

// ============================================
// Singleton Socket.IO client for TERENCE
// ============================================
// One socket per browser tab, shared by every realtime hook. Reconnects
// automatically with backoff. The server joins the per-user room from the
// session cookie sent with each handshake, so rooms survive reconnects.
//
// All listeners are added with `on()` — *not* `once()` — so handlers
// survive reconnects. Unmounting components must call the returned
// unsubscribe to avoid leaks.

import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null
let currentUserId: string | null = null

export interface RealtimeOptions {
  userId: string | null
}

/**
 * Get (or create) the shared socket. Pass `userId` so a login that happened
 * after the socket connected triggers a fresh, authenticated handshake.
 */
export function getRealtimeSocket(opts: RealtimeOptions): Socket {
  if (!socketInstance) {
    socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10_000,
      timeout: 8_000,
    })

    // Silent on connect errors — local `next dev` without the custom
    // server returns 404 here and we don't want toast spam.
    socketInstance.on('connect_error', () => { /* expected sometimes */ })
  }

  // The server derives identity from the session cookie sent with the
  // handshake, so a login/logout requires a fresh handshake to take effect.
  // Guest hooks pass `null`, so only a new non-null id triggers a reconnect.
  if (opts.userId && opts.userId !== currentUserId) {
    currentUserId = opts.userId
    if (socketInstance.connected) {
      socketInstance.disconnect().connect()
    }
  }

  return socketInstance
}

export function disconnectRealtimeSocket() {
  if (socketInstance) {
    try { socketInstance.disconnect() } catch { /* noop */ }
    socketInstance = null
    currentUserId = null
  }
}

// ─── Event names — keep in sync with src/be/shared/realtime/notify.ts ──

export const RT = {
  TCOIN_UPDATED: 'tcoin:updated',
  TCOIN_TX_NEW:  'tcoin:transaction:new',
  TASK_CLAIMED:  'task:claimed',
  REWARD_REDEEMED: 'reward:redeemed',
  TCOIN_PAID: 'tcoin:paid',

  WATCH_PROGRESS: 'watch:progress',
  WATCH_COMPLETED: 'watch:completed',

  ADS_CREATED: 'ads:created',
  ADS_UPDATED: 'ads:updated',
  ADS_DELETED: 'ads:deleted',

  REVIEW_CREATED: 'review:created',
  REVIEW_LIKED:   'review:liked',

  NOTIFICATION_NEW: 'notification:new',

  MOVIE_VIEWERS: 'movie:viewers',
  MOVIE_VIEWCOUNT: 'movie:viewcount',
  TOPVIEW_STATS: 'topview:stats',

  DASH_STATS:   'dashboard:stats',
  USERS_ONLINE: 'users:online',

  ROOM_AD_START: 'room:ad:start',
  ROOM_AD_SYNC:  'room:ad:sync',
  ROOM_AD_END:   'room:ad:end',
} as const

export type RTEvent = (typeof RT)[keyof typeof RT]
