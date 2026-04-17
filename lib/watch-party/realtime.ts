'use client'

// ============================================
// Watch Party — Realtime Transport Layer
// ============================================
// Abstraction for realtime communication in watch party rooms.
//
// New implementation: Socket.IO
// Replaces Polling + BroadcastChannel for robust cross-network realtime sync.

import { io, Socket } from 'socket.io-client'
import type { WatchPartySyncEvent, WatchRoomMessage } from './types'

// ── Types ──

export type RealtimeEventHandler = (event: WatchPartySyncEvent) => void

export interface RealtimeChannel {
  /** Room code this channel is connected to */
  roomCode: string
  /** Send a sync event to all participants */
  send: (event: WatchPartySyncEvent) => void
  /** Register event handler */
  onEvent: (handler: RealtimeEventHandler) => void
  /** Remove event handler */
  offEvent: (handler: RealtimeEventHandler) => void
  /** Disconnect and cleanup */
  disconnect: () => void
  /** Emit raw socket event for custom logic */
  emitRaw: (event: string, payload: any) => void
  /** Listen to raw socket events */
  onRaw: (event: string, handler: (data: any) => void) => void
  /** Whether channel is connected */
  isConnected: boolean
}

// ── Socket.IO Implementation ──

export function createRealtimeChannel(
  roomCode: string,
  memberId: string,
): RealtimeChannel {
  const handlers = new Set<RealtimeEventHandler>()
  let socket: Socket | null = null
  let connected = false

  function connect() {
    if (connected) return

    socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      connected = true
      // We join the room without modifying host config, that is done via API logic previously.
      socket?.emit('wp:join', {
        roomCode,
        userId: memberId,
        displayName: 'Member',
        isHost: false, // The socket handler respects existing host logic
      })
    })

    socket.on('disconnect', () => {
      connected = false
    })

    // Player Events
    socket.on('wp:play', (data: { currentTime: number; by: string }) => {
      if (data.by !== memberId) handlers.forEach((h) => h({ type: 'PLAY', currentTime: data.currentTime, senderId: data.by }))
    })

    socket.on('wp:pause', (data: { currentTime: number; by: string }) => {
      if (data.by !== memberId) handlers.forEach((h) => h({ type: 'PAUSE', currentTime: data.currentTime, senderId: data.by }))
    })

    socket.on('wp:seek', (data: { currentTime: number; by: string }) => {
      if (data.by !== memberId) handlers.forEach((h) => h({ type: 'SEEK', currentTime: data.currentTime, senderId: data.by }))
    })

    socket.on('wp:state', (data: any) => {
      handlers.forEach((h) =>
        h({
          type: 'STATE_SYNC',
          currentTime: data.playbackTime,
          isPlaying: data.isPlaying,
          serverIndex: 0,
          senderId: data.lastEventBy || 'server',
        })
      )
    })

    // Chat Events
    socket.on('wp:chat-message', (data: WatchRoomMessage) => {
      if (data.senderId !== memberId) {
        handlers.forEach((h) => h({ type: 'CHAT_MESSAGE', message: data }))
      }
    })

    // Room Membership Events
    socket.on('wp:user-joined', (data: { userId: string; displayName: string }) => {
      handlers.forEach((h) =>
        h({ type: 'MEMBER_JOIN', member: { id: data.userId, userId: data.userId, guestName: data.displayName, role: 'viewer', isOnline: true } as any })
      )
    })

    socket.on('wp:user-left', (data: { userId: string; displayName?: string }) => {
      handlers.forEach((h) => h({ type: 'MEMBER_LEAVE', memberId: data.userId, memberName: data.displayName || 'Thành viên' }))
    })

    socket.on('wp:error', (data: { message: string }) => {
        console.error('[WatchParty] Socket Error:', data.message)
    })
  }

  function disconnect() {
    if (socket) {
      socket.emit('wp:leave', { roomCode, userId: memberId })
      socket.disconnect()
      socket = null
    }
    connected = false
    handlers.clear()
  }

  function send(event: WatchPartySyncEvent) {
    if (!socket) return

    // Immediately trigger local broadcast to simulate instant reflection if we are host, but PlayerSyncService handles local loops.
    // Instead we just emit to the socket.io backend.
    switch (event.type) {
      case 'PLAY':
        socket.emit('wp:play', { roomCode, userId: memberId, currentTime: event.currentTime })
        break
      case 'PAUSE':
        socket.emit('wp:pause', { roomCode, userId: memberId, currentTime: event.currentTime })
        break
      case 'SEEK':
        socket.emit('wp:seek', { roomCode, userId: memberId, currentTime: event.currentTime })
        break
      case 'CHAT_MESSAGE':
        socket.emit('wp:chat', {
          roomCode,
          userId: memberId,
          displayName: event.message.senderName,
          content: event.message.content,
        })
        break
      case 'STATE_SYNC':
      case 'CHANGE_EPISODE':
      case 'CHANGE_SERVER':
         // We might implement these later or fallback to API
         break
      default:
        break
    }
  }

  // Auto-connect
  connect()

  return {
    roomCode,
    send,
    emitRaw: (event, payload) => {
      if (socket) socket.emit(event, payload)
    },
    onRaw: (event, handler) => {
      if (socket) socket.on(event, handler)
    },
    onEvent: (handler) => handlers.add(handler),
    offEvent: (handler) => handlers.delete(handler),
    disconnect,
    get isConnected() {
      return connected
    },
  }
}
