'use client'

// ============================================
// useWatchSync — Socket.IO Watch Party Sync Hook
// ============================================
// Real-time player synchronization via Socket.IO
// - Host: emit control events (play, pause, seek)
// - Viewer: listen and sync player

import { useRef, useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// ── Types ──

export interface SyncState {
  playbackTime: number
  isPlaying: boolean
  hostId: string | null
  participantCount: number
}

export interface UseWatchSyncOptions {
  /** Room code */
  roomCode: string
  /** Current user ID */
  userId: string
  /** Current user display name */
  displayName: string
  /** Is this user the host? */
  isHost: boolean
  /** Enable socket connection */
  enabled?: boolean
  /** Callback when play event received from host */
  onPlay?: (currentTime: number) => void
  /** Callback when pause event received from host */
  onPause?: (currentTime: number) => void
  /** Callback when seek event received from host */
  onSeek?: (currentTime: number) => void
  /** Callback when full state sync received */
  onStateSync?: (state: SyncState) => void
  /** Callback when host requests current time (for host only) */
  onTimeRequest?: () => { currentTime: number; isPlaying: boolean } | null
  /** Callback when a chat message is received */
  onChatMessage?: (message: ChatMessage) => void
  /** Callback when host changes */
  onHostChanged?: (newHostId: string, newHostName: string) => void
  /** Callback when user joins */
  onUserJoined?: (userId: string, displayName: string, count: number) => void
  /** Callback when user leaves */
  onUserLeft?: (userId: string, displayName: string, count: number) => void
  /** Callback on error */
  onError?: (message: string) => void
}

export interface ChatMessage {
  id: string
  senderName: string
  senderId: string
  type: string
  content: string
  createdAt: string
}

export interface UseWatchSyncReturn {
  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Current sync state */
  syncState: SyncState | null
  /** Emit play event (host only) */
  emitPlay: (currentTime: number) => void
  /** Emit pause event (host only) */
  emitPause: (currentTime: number) => void
  /** Emit seek event (host only) */
  emitSeek: (currentTime: number) => void
  /** Emit sync-time (host periodic update) */
  emitSyncTime: (currentTime: number, isPlaying: boolean) => void
  /** Send chat message */
  sendChat: (content: string) => void
  /** Transfer host */
  transferHost: (newHostId: string) => void
  /** Leave room */
  leave: () => void
  /** Socket instance for advanced use */
  socket: Socket | null
}

// ═══════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════

export function useWatchSync(options: UseWatchSyncOptions): UseWatchSyncReturn {
  const {
    roomCode,
    userId,
    displayName,
    isHost,
    enabled = true,
    onPlay,
    onPause,
    onSeek,
    onStateSync,
    onTimeRequest,
    onChatMessage,
    onHostChanged,
    onUserJoined,
    onUserLeft,
    onError,
  } = options

  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [syncState, setSyncState] = useState<SyncState | null>(null)

  // Store callbacks in refs to avoid re-rendering loops
  const callbacksRef = useRef({
    onPlay, onPause, onSeek, onStateSync, onTimeRequest,
    onChatMessage, onHostChanged, onUserJoined, onUserLeft, onError,
  })
  callbacksRef.current = {
    onPlay, onPause, onSeek, onStateSync, onTimeRequest,
    onChatMessage, onHostChanged, onUserJoined, onUserLeft, onError,
  }

  // ── Connect ──
  useEffect(() => {
    if (!enabled || !roomCode || !userId) return

    setStatus('connecting')

    const socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketRef.current = socket

    // ── Connection events ──
    socket.on('connect', () => {
      console.log(`[WatchSync] Connected: ${socket.id}`)
      setStatus('connected')

      // Join the room
      socket.emit('wp:join', {
        roomCode,
        userId,
        displayName,
        isHost,
      })
    })

    socket.on('disconnect', () => {
      console.log('[WatchSync] Disconnected')
      setStatus('disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('[WatchSync] Connection error:', err.message)
      setStatus('error')
    })

    // ── Sync events ──
    socket.on('wp:state', (state: SyncState) => {
      setSyncState(state)
      callbacksRef.current.onStateSync?.(state)
    })

    socket.on('wp:play', (data: { currentTime: number; by: string }) => {
      callbacksRef.current.onPlay?.(data.currentTime)
    })

    socket.on('wp:pause', (data: { currentTime: number; by: string }) => {
      callbacksRef.current.onPause?.(data.currentTime)
    })

    socket.on('wp:seek', (data: { currentTime: number; by: string }) => {
      callbacksRef.current.onSeek?.(data.currentTime)
    })

    // Host receives time request from server
    socket.on('wp:request-time', () => {
      const timeData = callbacksRef.current.onTimeRequest?.()
      if (timeData) {
        socket.emit('wp:sync-time', {
          roomCode,
          userId,
          currentTime: timeData.currentTime,
          isPlaying: timeData.isPlaying,
        })
      }
    })

    // ── Chat ──
    socket.on('wp:chat-message', (message: ChatMessage) => {
      callbacksRef.current.onChatMessage?.(message)
    })

    // ── Room events ──
    socket.on('wp:host-changed', (data: { newHostId: string; newHostName: string }) => {
      callbacksRef.current.onHostChanged?.(data.newHostId, data.newHostName)
    })

    socket.on('wp:user-joined', (data: { userId: string; displayName: string; participantCount: number }) => {
      callbacksRef.current.onUserJoined?.(data.userId, data.displayName, data.participantCount)
    })

    socket.on('wp:user-left', (data: { userId: string; displayName: string; participantCount: number }) => {
      callbacksRef.current.onUserLeft?.(data.userId, data.displayName, data.participantCount)
    })

    // ── Error ──
    socket.on('wp:error', (data: { message: string }) => {
      callbacksRef.current.onError?.(data.message)
    })

    // ── Cleanup ──
    return () => {
      socket.emit('wp:leave', { roomCode, userId })
      socket.disconnect()
      socketRef.current = null
      setStatus('disconnected')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomCode, userId, displayName, isHost])

  // ── Host periodic sync (every 5s) ──
  useEffect(() => {
    if (!isHost || status !== 'connected') return

    const interval = setInterval(() => {
      const timeData = callbacksRef.current.onTimeRequest?.()
      if (timeData && socketRef.current) {
        socketRef.current.emit('wp:sync-time', {
          roomCode,
          userId,
          currentTime: timeData.currentTime,
          isPlaying: timeData.isPlaying,
        })
      }
    }, 5000) // 5s sync interval

    return () => clearInterval(interval)
  }, [isHost, status, roomCode, userId])

  // ── Emit functions ──

  const emitPlay = useCallback((currentTime: number) => {
    socketRef.current?.emit('wp:play', { roomCode, userId, currentTime })
  }, [roomCode, userId])

  const emitPause = useCallback((currentTime: number) => {
    socketRef.current?.emit('wp:pause', { roomCode, userId, currentTime })
  }, [roomCode, userId])

  const emitSeek = useCallback((currentTime: number) => {
    socketRef.current?.emit('wp:seek', { roomCode, userId, currentTime })
  }, [roomCode, userId])

  const emitSyncTime = useCallback((currentTime: number, isPlaying: boolean) => {
    socketRef.current?.emit('wp:sync-time', { roomCode, userId, currentTime, isPlaying })
  }, [roomCode, userId])

  const sendChat = useCallback((content: string) => {
    socketRef.current?.emit('wp:chat', {
      roomCode,
      userId,
      displayName,
      content,
    })
  }, [roomCode, userId, displayName])

  const transferHost = useCallback((newHostId: string) => {
    socketRef.current?.emit('wp:transfer-host', { roomCode, userId, newHostId })
  }, [roomCode, userId])

  const leave = useCallback(() => {
    socketRef.current?.emit('wp:leave', { roomCode, userId })
    socketRef.current?.disconnect()
  }, [roomCode, userId])

  return {
    status,
    syncState,
    emitPlay,
    emitPause,
    emitSeek,
    emitSyncTime,
    sendChat,
    transferHost,
    leave,
    socket: socketRef.current,
  }
}
