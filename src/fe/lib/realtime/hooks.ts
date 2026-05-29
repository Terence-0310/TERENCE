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

export interface DashboardStats {
  onlineUsers: number
  tcoinEarnedToday: number
  tcoinSpentToday: number
  activeAdsCount: number
  adImpressionsToday: number
  redeemsToday: number
  ts: number
}

export function useAdminDashboardRealtime(userId: string | null): {
  stats: DashboardStats | null
  onlineUsers: number | null
} {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [online, setOnline] = useState<number | null>(null)

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

  useSocketEvent<DashboardStats>(RT.DASH_STATS, (p) => setStats(p), userId)
  useSocketEvent<{ count: number }>(RT.USERS_ONLINE, (p) => setOnline(p.count), userId)

  return { stats, onlineUsers: online }
}
