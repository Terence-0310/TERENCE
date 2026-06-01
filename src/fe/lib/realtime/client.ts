'use client'

// ============================================
// Singleton Socket.IO client for TERENCE
// ============================================
// One socket per browser tab, shared by every realtime hook. Reconnects
// automatically with backoff; emits `user:identify` on every (re)connect
// so per-user rooms are restored after a network blip.
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
 * Get (or create) the shared socket. Pass `userId` so the socket joins
 * the correct per-user room. If userId changes (e.g. on logout/login)
 * we re-identify rather than tearing down the connection.
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

    socketInstance.on('connect', () => {
      if (currentUserId) {
        socketInstance!.emit('user:identify', { userId: currentUserId })
      }
    })

    // Silent on connect errors — local `next dev` without the custom
    // server returns 404 here and we don't want toast spam.
    socketInstance.on('connect_error', () => { /* expected sometimes */ })
  }

  if (opts.userId && opts.userId !== currentUserId) {
    currentUserId = opts.userId
    if (socketInstance.connected) {
      socketInstance.emit('user:identify', { userId: opts.userId })
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
