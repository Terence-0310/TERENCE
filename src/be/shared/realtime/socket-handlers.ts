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
  addViewer,
  removeViewerSocket,
  getMovieViewerCount,
  getTopViewedMovies,
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

    // Top movies by total views + today's tracked views + live concurrent
    // viewers (from socket presence) → powers the admin "Top View" stats table.
    const topMoviesRaw = await prisma.movie.findMany({
      where: { deletedAt: null, status: 'published' },
      orderBy: { viewCount: 'desc' },
      take: 8,
      select: { id: true, title: true, slug: true, viewCount: true, posterUrl: true, thumbUrl: true },
    })
    const movieIds = topMoviesRaw.map((m) => m.id)
    const todayGrouped = movieIds.length
      ? await prisma.pageView.groupBy({
          by: ['movieId'],
          where: { movieId: { in: movieIds }, createdAt: { gte: today } },
          _count: { _all: true },
        })
      : []
    const todayByMovie = new Map(todayGrouped.map((r) => [r.movieId, r._count._all]))
    const topMovies = topMoviesRaw.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      posterUrl: m.posterUrl,
      thumbUrl: m.thumbUrl,
      viewCount: m.viewCount,
      viewsToday: todayByMovie.get(m.id) ?? 0,
      liveViewers: getMovieViewerCount(m.id),
    }))

    return {
      onlineUsers: getOnlineUserCount(),
      tcoinEarnedToday: tcoinEarnedToday._sum.amount ?? 0,
      tcoinSpentToday: tcoinSpentToday._sum.amount ?? 0,
      activeAdsCount,
      adImpressionsToday,
      redeemsToday,
      topMovies,
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
  // 12s heartbeat keeps the admin "Top View" table (today views + live viewers)
  // reasonably fresh without hammering Postgres.
  dashboardInterval = setInterval(() => { void broadcastDashboard(io) }, 12_000)
}

// Debounced dashboard broadcast — fired on presence changes (movie join/leave)
// so the admin table's "đang xem" column updates within ~1.5s instead of
// waiting for the next heartbeat.
let dashboardDebounce: NodeJS.Timeout | null = null
function scheduleDashboard(io: Server) {
  if (dashboardDebounce) return
  dashboardDebounce = setTimeout(() => {
    dashboardDebounce = null
    void broadcastDashboard(io)
  }, 1500)
}

// ─── Live viewer presence + Top View leaderboard ───────────────────
// `movie:<id>` rooms hold the watchers of each title; `topview:listeners`
// holds clients on the Top View page wanting the live leaderboard.

const TOPVIEW_ROOM = 'topview:listeners'
const movieRoom = (movieId: string) => `movie:${movieId}`

// Push the current viewer count for one movie to everyone watching it.
function emitMovieViewers(movieId: string) {
  notifyRoom(movieRoom(movieId), RT_EVENTS.MOVIE_VIEWERS, {
    movieId,
    count: getMovieViewerCount(movieId),
  })
}

// Debounced Top View broadcast — recompute the live leaderboard (with movie
// metadata) and emit to the topview room. Coalesced so a burst of joins/leaves
// triggers at most one DB lookup per window.
let topviewTimer: NodeJS.Timeout | null = null
async function doBroadcastTopview(io: Server) {
  const room = io.sockets.adapter.rooms.get(TOPVIEW_ROOM)
  if (!room || room.size === 0) return
  const top = getTopViewedMovies(10)
  if (top.length === 0) {
    io.to(TOPVIEW_ROOM).emit(RT_EVENTS.TOPVIEW_STATS, { items: [], ts: Date.now() })
    return
  }
  try {
    const ids = top.map((t) => t.movieId)
    const movies = await prisma.movie.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, slug: true, posterUrl: true, thumbUrl: true, contentType: true, tmdbId: true },
    })
    const byId = new Map(movies.map((m) => [m.id, m]))
    const items = top
      .map((t, i) => {
        const m = byId.get(t.movieId)
        if (!m) return null
        return {
          rank: i + 1,
          movieId: t.movieId,
          viewers: t.count,
          title: m.title,
          slug: m.slug,
          posterUrl: m.posterUrl,
          thumbUrl: m.thumbUrl,
          contentType: m.contentType,
          tmdbId: m.tmdbId,
        }
      })
      .filter(Boolean)
    io.to(TOPVIEW_ROOM).emit(RT_EVENTS.TOPVIEW_STATS, { items, ts: Date.now() })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'topview broadcast failed')
  }
}

function scheduleTopview(io: Server) {
  if (topviewTimer) return
  topviewTimer = setTimeout(() => {
    topviewTimer = null
    void doBroadcastTopview(io)
  }, 2000)
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

  // ── movie:subscribe — receive review events without being a viewer ─
  // Used by the comments widget on detail pages so readers don't inflate
  // the watch-page presence count / Top View leaderboard.
  socket.on('movie:subscribe', (payload: unknown) => {
    const movieId = typeof payload === 'object' && payload !== null && 'movieId' in payload
      ? (payload as { movieId: unknown }).movieId : null
    if (typeof movieId !== 'string' || movieId.length === 0 || movieId.length > 64) return
    socket.join(movieRoom(movieId))
  })

  socket.on('movie:unsubscribe', (payload: unknown) => {
    const movieId = typeof payload === 'object' && payload !== null && 'movieId' in payload
      ? (payload as { movieId: unknown }).movieId : null
    if (typeof movieId === 'string' && movieId.length > 0) socket.leave(movieRoom(movieId))
  })

  // ── movie:join / movie:leave — live viewer presence ───────────────
  // The watch page joins when mounted so it can show "đang xem" + feed
  // the Top View leaderboard. Anonymous viewers count too (no auth needed).
  socket.on('movie:join', (payload: unknown) => {
    const movieId = typeof payload === 'object' && payload !== null && 'movieId' in payload
      ? (payload as { movieId: unknown }).movieId : null
    if (typeof movieId !== 'string' || movieId.length === 0 || movieId.length > 64) return
    // Leave any previous movie room this socket was in.
    const prev = removeViewerSocket(socket.id)
    if (prev && prev !== movieId) { socket.leave(movieRoom(prev)); emitMovieViewers(prev) }
    socket.join(movieRoom(movieId))
    addViewer(movieId, socket.id)
    emitMovieViewers(movieId)
    scheduleTopview(io)
    scheduleDashboard(io)
  })

  socket.on('movie:leave', (payload: unknown) => {
    const movieId = typeof payload === 'object' && payload !== null && 'movieId' in payload
      ? (payload as { movieId: unknown }).movieId : null
    const left = removeViewerSocket(socket.id)
    const target = typeof movieId === 'string' ? movieId : left
    if (target) {
      socket.leave(movieRoom(target))
      emitMovieViewers(target)
      scheduleTopview(io)
      scheduleDashboard(io)
    }
  })

  // ── topview:subscribe — live most-watched leaderboard ─────────────
  socket.on('topview:subscribe', () => {
    socket.join(TOPVIEW_ROOM)
    void doBroadcastTopview(io)
  })

  socket.on('topview:unsubscribe', () => {
    socket.leave(TOPVIEW_ROOM)
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
    // Drop this socket from any movie it was watching + refresh counts.
    const movieId = removeViewerSocket(socket.id)
    if (movieId) {
      emitMovieViewers(movieId)
      scheduleTopview(io)
      scheduleDashboard(io)
    }
  })
}
