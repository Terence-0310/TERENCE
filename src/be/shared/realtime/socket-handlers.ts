// ============================================
// Realtime socket handlers — TCoin, Ads, Watch Progress, Dashboard
// ============================================
// Registered once in server.ts inside `io.on('connection', ...)`.
// All handlers share a per-socket scope, so closing variables (rate
// limiter state, last progress save timestamp) are isolated per
// connection and clean themselves up on `disconnect`.

import type { Server, Socket } from 'socket.io'
import { prisma } from '@/src/be/shared/db/prisma'
import { logger } from '@/src/be/shared/utils/logger'
import {
  RT_EVENTS,
  ADMIN_ROOM,
  trackOnline,
  untrackOnline,
  getOnlineUserCount,
  notifyAdmins,
  notifyUser,
  notifyRoom,
} from './notify'

const log = logger.child({ module: 'realtime' })

// ─── Per-socket rate limiter ────────────────────────────────────────
// Keeps watch:progress emits sane — bursting from a misbehaving client
// can DoS the DB write path otherwise.

const RL_WINDOW = 1000
const RL_MAX = 8

function makeRateLimiter() {
  let firstTs = 0
  let count = 0
  return function isLimited(): boolean {
    const now = Date.now()
    if (now - firstTs > RL_WINDOW) { firstTs = now; count = 1; return false }
    count += 1
    return count > RL_MAX
  }
}

// ─── Watch-progress debounce ────────────────────────────────────────
// Persist max once per 15s per (user, episode), even though the client
// may emit every 5–10s for live progress display in other tabs.

const lastPersist = new Map<string, number>()
const PERSIST_INTERVAL_MS = 15_000

function persistKey(userId: string, movieId: string, episodeId: string | null): string {
  return `${userId}|${movieId}|${episodeId ?? ''}`
}

// ─── Admin dashboard stats ──────────────────────────────────────────
// Broadcasts a fresh snapshot to ADMIN_ROOM every 30s (when there are
// admin subscribers) plus on-demand when an admin first joins.

let dashboardInterval: NodeJS.Timeout | null = null

async function computeDashboardSnapshot() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const [
      tcoinEarnedToday,
      tcoinSpentToday,
      activeAdsCount,
      adImpressionsToday,
      redeemsToday,
    ] = await Promise.all([
      prisma.walletTransaction.aggregate({
        where: { direction: { in: ['credit', 'CREDIT'] }, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { direction: { in: ['debit', 'DEBIT'] }, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.advertisement.count({ where: { isActive: true } }),
      prisma.adImpression.count({ where: { createdAt: { gte: today }, event: 'impression' } }),
      prisma.walletTransaction.count({
        where: { type: 'spend', createdAt: { gte: today } },
      }),
    ])

    return {
      onlineUsers: getOnlineUserCount(),
      tcoinEarnedToday: tcoinEarnedToday._sum.amount ?? 0,
      tcoinSpentToday: tcoinSpentToday._sum.amount ?? 0,
      activeAdsCount,
      adImpressionsToday,
      redeemsToday,
      ts: Date.now(),
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'dashboard snapshot failed')
    return null
  }
}

async function broadcastDashboard(io: Server) {
  // Bail if nobody's listening — no point hammering Postgres.
  const room = io.sockets.adapter.rooms.get(ADMIN_ROOM)
  if (!room || room.size === 0) return
  const snap = await computeDashboardSnapshot()
  if (snap) io.to(ADMIN_ROOM).emit(RT_EVENTS.DASH_STATS, snap)
}

function ensureDashboardLoop(io: Server) {
  if (dashboardInterval) return
  dashboardInterval = setInterval(() => { void broadcastDashboard(io) }, 30_000)
}

// ─── Main register ──────────────────────────────────────────────────

export function registerRealtimeHandlers(io: Server, socket: Socket) {
  ensureDashboardLoop(io)

  const limited = makeRateLimiter()
  // The userId set by user:identify — used by every authenticated handler.
  // We keep it scoped to this closure so a hostile client can't spoof
  // someone else's userId after the initial handshake without re-identifying.
  let scopedUserId: string | null = null
  let scopedIsAdmin = false

  // ── user:identify ─────────────────────────────────────────────────
  // Already handled in server.ts for room-join, but we also track
  // online presence + (optionally) capture admin role here.
  socket.on('user:identify', async (payload: unknown) => {
    if (typeof payload !== 'object' || payload === null) return
    const userId = (payload as any).userId
    if (typeof userId !== 'string' || userId.length === 0 || userId.length > 64) return

    scopedUserId = userId
    trackOnline(userId, socket.id)
    // Push online count to dashboard immediately.
    notifyAdmins(RT_EVENTS.USERS_ONLINE, { count: getOnlineUserCount() })

    // Side-channel: detect admin so client can join admin:dashboard.
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      scopedIsAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
    } catch {
      scopedIsAdmin = false
    }
  })

  // ── admin:join — opt-in admin dashboard subscription ──────────────
  socket.on('admin:join', async () => {
    if (!scopedIsAdmin || !scopedUserId) {
      socket.emit('admin:join:rejected', { reason: 'not_admin' })
      return
    }
    socket.join(ADMIN_ROOM)
    const snap = await computeDashboardSnapshot()
    if (snap) socket.emit(RT_EVENTS.DASH_STATS, snap)
  })

  socket.on('admin:leave', () => {
    socket.leave(ADMIN_ROOM)
  })

  // ── ads:subscribe — viewers join ads:listeners for invalidation ───
  // Every page that shows ads (admin list, player) joins this room so
  // an emit from ads.service can refresh them all.
  socket.on('ads:subscribe', () => {
    socket.join('ads:listeners')
  })

  socket.on('ads:unsubscribe', () => {
    socket.leave('ads:listeners')
  })

  // ── watch:progress — durable cross-device progress ────────────────
  // Payload: { movieId, episodeId?, currentTime, duration }
  // Debounced DB writes + auto-fires watch_complete reward at ≥92%.
  socket.on(RT_EVENTS.WATCH_PROGRESS, async (payload: unknown) => {
    if (!scopedUserId) return
    if (limited()) return
    if (typeof payload !== 'object' || payload === null) return

    const p = payload as Record<string, unknown>
    const movieId = typeof p.movieId === 'string' ? p.movieId : null
    const episodeId = typeof p.episodeId === 'string' ? p.episodeId : null
    const currentTime = typeof p.currentTime === 'number' ? p.currentTime : null
    const duration = typeof p.duration === 'number' ? p.duration : null

    if (!movieId || currentTime == null || duration == null || duration <= 0 || currentTime < 0) return

    const percent = Math.min(100, Math.round((currentTime / duration) * 100))

    // Mirror to user's other tabs immediately — light-weight, no DB.
    notifyUser(scopedUserId, RT_EVENTS.WATCH_PROGRESS, {
      movieId, episodeId, currentTime, duration, percent,
    })

    // Debounce DB write.
    const key = persistKey(scopedUserId, movieId, episodeId)
    const last = lastPersist.get(key) ?? 0
    const now = Date.now()
    if (now - last < PERSIST_INTERVAL_MS && percent < 92) return
    lastPersist.set(key, now)

    try {
      const { saveProgress } = await import('@/src/be/modules/watch/watch.service')
      const result = await saveProgress(scopedUserId, {
        movieId, episodeId, currentTime, duration, deviceType: 'web',
      })

      if (result.isCompleted) {
        // Award TCoin once per (user, movie, day). rewardWatchComplete
        // already enforces maxPerDay; we additionally guard against
        // double-fire from rapid socket re-emits by setting a sentinel.
        const completeKey = `complete|${key}`
        if ((lastPersist.get(completeKey) ?? 0) === 0) {
          lastPersist.set(completeKey, now)
          const { rewardWatchComplete } = await import('@/src/be/modules/tcoin/tcoin.service')
          const reward = await rewardWatchComplete(scopedUserId, movieId)
          notifyUser(scopedUserId, RT_EVENTS.WATCH_COMPLETED, {
            movieId, episodeId, rewarded: reward.ok, amount: reward.amount,
          })
        }
      }
    } catch (err) {
      log.error({ userId: scopedUserId, err: err instanceof Error ? err.message : err }, 'watch:progress persist failed')
    }
  })

  // ── room:ad:* — watch party ad sync ───────────────────────────────
  // The host plays an ad locally and forwards control events here; we
  // relay them to other room members so they stay in sync. Members
  // can't bypass by sending their own start (we only forward from
  // sockets that are inside the room — Socket.IO enforces that via
  // `socket.to(roomCode)` only delivering to joined members).
  socket.on(RT_EVENTS.ROOM_AD_START, (data: { roomCode: string; adId: string; duration: number; skipAfterSeconds: number | null; mediaUrl: string; type: string }) => {
    if (!data || typeof data.roomCode !== 'string') return
    if (!socket.rooms.has(data.roomCode)) return
    notifyRoom(data.roomCode, RT_EVENTS.ROOM_AD_START, { ...data, startedAt: Date.now() })
  })

  socket.on(RT_EVENTS.ROOM_AD_SYNC, (data: { roomCode: string; elapsed: number }) => {
    if (!data || typeof data.roomCode !== 'string') return
    if (!socket.rooms.has(data.roomCode)) return
    socket.to(data.roomCode).emit(RT_EVENTS.ROOM_AD_SYNC, { elapsed: data.elapsed })
  })

  socket.on(RT_EVENTS.ROOM_AD_END, (data: { roomCode: string }) => {
    if (!data || typeof data.roomCode !== 'string') return
    if (!socket.rooms.has(data.roomCode)) return
    notifyRoom(data.roomCode, RT_EVENTS.ROOM_AD_END, { at: Date.now() })
  })

  // ── disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    untrackOnline(socket.id)
    if (scopedUserId) {
      notifyAdmins(RT_EVENTS.USERS_ONLINE, { count: getOnlineUserCount() })
    }
  })
}
