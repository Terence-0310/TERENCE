'use client'

// ============================================
// Realtime React hooks
// ============================================
// Thin wrappers around the singleton socket so components don't
// re-implement listener cleanup or reconnection logic. Each hook
// returns a `connected` flag plus whatever payload it tracks.

import { useEffect, useRef, useState, useCallback } from 'react'
import { getRealtimeSocket, RT } from './client'
import type { Socket } from 'socket.io-client'

// ─── Generic subscriber ─────────────────────────────────────────────

function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
  userId: string | null,
  deps: any[] = [],
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!userId) return
    const sock = getRealtimeSocket({ userId })
    const wrapped = (data: T) => handlerRef.current(data)
    sock.on(event, wrapped)
    return () => { sock.off(event, wrapped) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, userId, ...deps])
}

export function useConnectedSocket(userId: string | null): { socket: Socket | null; connected: boolean } {
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userId) return
    const sock = getRealtimeSocket({ userId })
    setSocket(sock)
    setConnected(sock.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)
    return () => {
      sock.off('connect', onConnect)
      sock.off('disconnect', onDisconnect)
    }
  }, [userId])

  return { socket, connected }
}

// ─── TCoin ──────────────────────────────────────────────────────────

export interface TCoinUpdatePayload {
  userId: string
  balance: number
}

export interface TCoinTxPayload {
  userId: string
  balance: number
  transaction: {
    id: string
    type: string
    direction: 'credit' | 'debit' | string
    amount: number
    balanceBefore: number
    balanceAfter: number
    referenceId: string | null
    createdAt: string
  }
}

export interface TaskClaimedPayload { taskId: string; amount: number; balance: number }
export interface RewardRedeemedPayload { optionId: string; name: string; cost: number; balance: number }

export function useTCoinRealtime(
  userId: string | null,
  callbacks: {
    onUpdate?: (p: TCoinUpdatePayload) => void
    onTransaction?: (p: TCoinTxPayload) => void
    onTaskClaimed?: (p: TaskClaimedPayload) => void
    onRewardRedeemed?: (p: RewardRedeemedPayload) => void
    onPaid?: (p: any) => void
  },
) {
  useSocketEvent<TCoinUpdatePayload>(RT.TCOIN_UPDATED, (p) => callbacks.onUpdate?.(p), userId)
  useSocketEvent<TCoinTxPayload>(RT.TCOIN_TX_NEW, (p) => callbacks.onTransaction?.(p), userId)
  useSocketEvent<TaskClaimedPayload>(RT.TASK_CLAIMED, (p) => callbacks.onTaskClaimed?.(p), userId)
  useSocketEvent<RewardRedeemedPayload>(RT.REWARD_REDEEMED, (p) => callbacks.onRewardRedeemed?.(p), userId)
  useSocketEvent(RT.TCOIN_PAID, (p) => callbacks.onPaid?.(p), userId)
}

// ─── Ads ────────────────────────────────────────────────────────────

export function useAdsRealtime(
  userId: string | null,
  callbacks: {
    onCreated?: (ad: any) => void
    onUpdated?: (ad: any) => void
    onDeleted?: (p: { id: string }) => void
  },
) {
  // Subscribe to the ads room on mount.
  useEffect(() => {
    if (!userId) return
    const sock = getRealtimeSocket({ userId })
    const join = () => sock.emit('ads:subscribe')
    if (sock.connected) join()
    sock.on('connect', join)
    return () => {
      sock.off('connect', join)
      try { sock.emit('ads:unsubscribe') } catch { /* noop */ }
    }
  }, [userId])

  useSocketEvent(RT.ADS_CREATED, (p) => callbacks.onCreated?.(p), userId)
  useSocketEvent(RT.ADS_UPDATED, (p) => callbacks.onUpdated?.(p), userId)
  useSocketEvent<{ id: string }>(RT.ADS_DELETED, (p) => callbacks.onDeleted?.(p), userId)
}

// ─── Watch progress ─────────────────────────────────────────────────

export interface WatchProgressEmit {
  movieId: string
  episodeId?: string | null
  currentTime: number
  duration: number
}

/**
 * Emit watch progress at most once every `intervalMs` (default 15s).
 * Returns an `emit` function the player calls on `timeupdate`. The
 * server further debounces DB writes — the client just needs to
 * stop hammering the websocket.
 */
export function useWatchProgressEmitter(userId: string | null, intervalMs = 15_000) {
  const lastEmitRef = useRef(0)

  const emit = useCallback((payload: WatchProgressEmit) => {
    if (!userId) return
    const now = Date.now()
    if (now - lastEmitRef.current < intervalMs) return
    lastEmitRef.current = now
    const sock = getRealtimeSocket({ userId })
    if (!sock.connected) return
    sock.emit(RT.WATCH_PROGRESS, payload)
  }, [userId, intervalMs])

  // Force-emit (e.g. on pause / unload) — bypasses the throttle.
  const flush = useCallback((payload: WatchProgressEmit) => {
    if (!userId) return
    lastEmitRef.current = Date.now()
    const sock = getRealtimeSocket({ userId })
    if (!sock.connected) return
    sock.emit(RT.WATCH_PROGRESS, payload)
  }, [userId])

  return { emit, flush }
}

export function useWatchCompletedListener(
  userId: string | null,
  cb: (p: { movieId: string; episodeId?: string | null; rewarded: boolean; amount: number }) => void,
) {
  useSocketEvent(RT.WATCH_COMPLETED, cb, userId)
}

// ─── Admin dashboard ────────────────────────────────────────────────

export interface TopMovieStat {
  id: string
  title: string
  slug: string | null
  posterUrl: string | null
  thumbUrl: string | null
  viewCount: number
  viewsToday: number
  liveViewers: number
}

export interface DashboardStats {
  onlineUsers: number
  tcoinEarnedToday: number
  tcoinSpentToday: number
  activeAdsCount: number
  adImpressionsToday: number
  redeemsToday: number
  topMovies?: TopMovieStat[]
  ts: number
}

export function useAdminDashboardRealtime(userId: string | null): {
  stats: DashboardStats | null
  onlineUsers: number | null
  topMovies: TopMovieStat[]
} {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [online, setOnline] = useState<number | null>(null)
  // Kept separate from `stats` so a MOVIE_VIEWCOUNT bump (between heartbeats)
  // updates a single row without waiting for the next full snapshot.
  const [topMovies, setTopMovies] = useState<TopMovieStat[]>([])

  useEffect(() => {
    if (!userId) return
    const sock = getRealtimeSocket({ userId })
    const join = () => sock.emit('admin:join')
    if (sock.connected) join()
    sock.on('connect', join)
    return () => {
      sock.off('connect', join)
      try { sock.emit('admin:leave') } catch { /* noop */ }
    }
  }, [userId])

  useSocketEvent<DashboardStats>(RT.DASH_STATS, (p) => {
    setStats(p)
    if (Array.isArray(p.topMovies)) setTopMovies(p.topMovies)
  }, userId)
  useSocketEvent<{ count: number }>(RT.USERS_ONLINE, (p) => setOnline(p.count), userId)

  // Realtime per-movie total-view bump: a real watch ticks the count up + adds
  // one to today's tally for that row, instantly, between snapshots.
  useSocketEvent<{ movieId: string; viewCount: number }>(RT.MOVIE_VIEWCOUNT, (p) => {
    setTopMovies((prev) => {
      if (!prev.some((m) => m.id === p.movieId)) return prev
      const next = prev.map((m) =>
        m.id === p.movieId ? { ...m, viewCount: p.viewCount, viewsToday: m.viewsToday + 1 } : m,
      )
      // Keep the same ranking the server uses (live → today → total) so a bump
      // can reorder rows between snapshots.
      return next.sort(
        (a, b) =>
          b.liveViewers - a.liveViewers || b.viewsToday - a.viewsToday || b.viewCount - a.viewCount,
      )
    })
  }, userId)

  return { stats, onlineUsers: online, topMovies }
}

// ─── Movie room: live viewers + review events ───────────────────────
// Joins the `movie:<id>` room (works for guests — userId may be null) so the
// component receives the live viewer count plus new/ liked reviews for that
// movie. One join/leave per mount.

export interface ReviewCreatedPayload {
  id: string
  movieId: string
  author: string
  avatar: string | null
  text: string
  rating: number
  createdAt: string
  isSpoiler?: boolean
  likeCount?: number
}
export interface ReviewLikedPayload { id: string; movieId: string; likeCount: number }

// Subscribe to a movie's room for live review events (new comment + likes).
// This does NOT count the client as a "viewer" — that's `useMovieViewers`,
// so detail-page comment readers don't inflate the watch-page presence count
// or the Top View leaderboard.
export function useMovieRoom(
  movieId: string | null,
  userId: string | null,
  callbacks?: {
    onReviewCreated?: (p: ReviewCreatedPayload) => void
    onReviewLiked?: (p: ReviewLikedPayload) => void
  },
): void {
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks

  useEffect(() => {
    if (!movieId) return
    const sock = getRealtimeSocket({ userId })
    const join = () => sock.emit('movie:subscribe', { movieId })
    if (sock.connected) join()
    sock.on('connect', join)

    const onCreated = (p: ReviewCreatedPayload) => {
      if (p?.movieId === movieId) cbRef.current?.onReviewCreated?.(p)
    }
    const onLiked = (p: ReviewLikedPayload) => {
      if (p?.movieId === movieId) cbRef.current?.onReviewLiked?.(p)
    }
    sock.on(RT.REVIEW_CREATED, onCreated)
    sock.on(RT.REVIEW_LIKED, onLiked)

    return () => {
      try { sock.emit('movie:unsubscribe', { movieId }) } catch { /* noop */ }
      sock.off('connect', join)
      sock.off(RT.REVIEW_CREATED, onCreated)
      sock.off(RT.REVIEW_LIKED, onLiked)
    }
  }, [movieId, userId])
}

// Presence: marks the client as actively watching `movieId` (counted toward the
// live viewer count + Top View leaderboard) and returns the current count.
export function useMovieViewers(movieId: string | null, userId: string | null): { viewerCount: number | null } {
  const [viewerCount, setViewerCount] = useState<number | null>(null)

  useEffect(() => {
    if (!movieId) return
    const sock = getRealtimeSocket({ userId })
    const join = () => sock.emit('movie:join', { movieId })
    if (sock.connected) join()
    sock.on('connect', join)
    const onViewers = (p: { movieId: string; count: number }) => {
      if (p?.movieId === movieId) setViewerCount(p.count)
    }
    sock.on(RT.MOVIE_VIEWERS, onViewers)
    return () => {
      try { sock.emit('movie:leave', { movieId }) } catch { /* noop */ }
      sock.off('connect', join)
      sock.off(RT.MOVIE_VIEWERS, onViewers)
    }
  }, [movieId, userId])

  return { viewerCount }
}

// ─── Top View: live most-watched leaderboard ────────────────────────

export interface TopViewItem {
  rank: number
  movieId: string
  viewers: number
  title: string
  slug: string
  posterUrl: string | null
  thumbUrl: string | null
  contentType: string
  tmdbId: number | null
}

export function useTopViewLive(userId: string | null): { items: TopViewItem[]; ts: number | null } {
  const [items, setItems] = useState<TopViewItem[]>([])
  const [ts, setTs] = useState<number | null>(null)

  useEffect(() => {
    const sock = getRealtimeSocket({ userId })
    const join = () => sock.emit('topview:subscribe')
    if (sock.connected) join()
    sock.on('connect', join)
    const onStats = (p: { items: TopViewItem[]; ts: number }) => {
      setItems(p?.items ?? [])
      setTs(p?.ts ?? null)
    }
    sock.on(RT.TOPVIEW_STATS, onStats)
    return () => {
      try { sock.emit('topview:unsubscribe') } catch { /* noop */ }
      sock.off('connect', join)
      sock.off(RT.TOPVIEW_STATS, onStats)
    }
  }, [userId])

  return { items, ts }
}

// ─── User notifications (bell) ──────────────────────────────────────

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export function useNotifications(userId: string | null): {
  items: NotificationItem[]
  unreadCount: number
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
} {
  const [items, setItems] = useState<NotificationItem[]>([])

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/v1/notifications')
      const body = await res.json().catch(() => null)
      const data = body?.data ?? body
      if (Array.isArray(data?.items)) setItems(data.items)
    } catch { /* offline — keep current */ }
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])

  // Prepend live notifications as they arrive.
  useSocketEvent<NotificationItem>(RT.NOTIFICATION_NEW, (p) => {
    setItems((prev) => (prev.some((n) => n.id === p.id) ? prev : [p, ...prev].slice(0, 50)))
  }, userId)

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try { await fetch('/api/v1/notifications/read-all', { method: 'POST' }) } catch { /* noop */ }
  }, [userId])

  const unreadCount = items.reduce((n, it) => n + (it.isRead ? 0 : 1), 0)

  return { items, unreadCount, markAllRead, refresh }
}
