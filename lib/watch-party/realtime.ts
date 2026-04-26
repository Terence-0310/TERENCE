'use client'

// ============================================
// Watch Party — Realtime Transport Layer
// ============================================
// Abstraction for realtime communication in watch party rooms.
//
// New implementation: Hybrid Socket.IO & LiveKit DataChannel
// Replaces Polling + BroadcastChannel for robust cross-network realtime sync.
//
// - Socket.IO: used for connections, room locks, approvals, UI actions.
// - LiveKit DataChannel: primary transport for SYNC and CHAT directly via UDP.
//

import { io, Socket } from 'socket.io-client'
import type { Room as LiveKitRoom } from 'livekit-client'
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
  /** Attach LiveKit room for pure data-channel UDP transport */
  setLiveKitRoom: (room: LiveKitRoom | null) => void
}

// ── Implementation ──

export function createRealtimeChannel(
  roomCode: string,
  memberId: string,
): RealtimeChannel {
  const handlers = new Set<RealtimeEventHandler>()
  let socket: Socket | null = null
  let connected = false
  let lkRoom: LiveKitRoom | null = null

  // ── LiveKit Data Channel Handler ──
  const handleLiveKitData = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
    if (topic !== 'wp-sync' && topic !== 'wp-chat') return
    try {
      const strData = new TextDecoder().decode(payload)
      const data = JSON.parse(strData) as any

      // System events from server
      if (['JOIN_REQUEST', 'JOIN_APPROVED', 'JOIN_REJECTED'].includes(data.type)) {
        handlers.forEach((h) => h(data))
        return
      }

      // Dispatch to local handlers
      if ((data.type === 'PLAY' || data.type === 'PAUSE' || data.type === 'SEEK') && data.senderId !== memberId) {
        handlers.forEach((h) => h(data))
      } else if (data.type === 'CHAT_MESSAGE' && data.message.senderId !== memberId) {
        handlers.forEach((h) => h(data))
      }
    } catch {
      // Ignore parse errors safely
    }
  }


  function setLiveKitRoom(room: LiveKitRoom | null) {
    if (lkRoom) {
      // Clean up previous event listener
      lkRoom.off('dataReceived', handleLiveKitData)
    }
    lkRoom = room
    if (lkRoom) {
      lkRoom.on('dataReceived', handleLiveKitData)
    }
  }

  function connect() {
    if (connected) return

    socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      connected = true
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

    // Player Events (Fallback when not using SFU DataChannel)
    socket.on('wp:play', (data: { currentTime: number; by: string }) => {
      if (!lkRoom && data.by !== memberId) handlers.forEach((h) => h({ type: 'PLAY', currentTime: data.currentTime, senderId: data.by }))
    })

    socket.on('wp:pause', (data: { currentTime: number; by: string }) => {
      if (!lkRoom && data.by !== memberId) handlers.forEach((h) => h({ type: 'PAUSE', currentTime: data.currentTime, senderId: data.by }))
    })

    socket.on('wp:seek', (data: { currentTime: number; by: string }) => {
      if (!lkRoom && data.by !== memberId) handlers.forEach((h) => h({ type: 'SEEK', currentTime: data.currentTime, senderId: data.by }))
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

    // Chat Events (Fallback when not using SFU DataChannel)
    socket.on('wp:chat-message', (data: WatchRoomMessage) => {
      if (!lkRoom && data.senderId !== memberId) {
        handlers.forEach((h) => h({ type: 'CHAT_MESSAGE', message: data }))
      }
    })

    // Room Membership Events (Socket-driven)
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
    if (lkRoom) {
      lkRoom.off('dataReceived', handleLiveKitData)
    }
    if (socket) {
      socket.emit('wp:leave', { roomCode, userId: memberId })
      socket.disconnect()
      socket = null
    }
    connected = false
    handlers.clear()
  }

  function send(event: WatchPartySyncEvent) {
    // ── 1. LiveKit DataChannel Fast-Path (SFU Transport) ──
    if (lkRoom && (event.type === 'PLAY' || event.type === 'PAUSE' || event.type === 'SEEK' || event.type === 'CHAT_MESSAGE')) {
      try {
        const payload = new TextEncoder().encode(JSON.stringify(event))
        const topic = event.type === 'CHAT_MESSAGE' ? 'wp-chat' : 'wp-sync'
        lkRoom.localParticipant.publishData(payload, { reliable: true, topic })

        // Notify server to gracefully persist state/chat without triggering a noisy broadcast fallback
        if (socket) {
          if (event.type === 'PLAY') {
            socket.emit('wp:sync-time', { roomCode, userId: memberId, currentTime: event.currentTime, isPlaying: true })
          } else if (event.type === 'PAUSE') {
            socket.emit('wp:sync-time', { roomCode, userId: memberId, currentTime: event.currentTime, isPlaying: false })
          } else if (event.type === 'SEEK') {
            socket.emit('wp:sync-time', { roomCode, userId: memberId, currentTime: event.currentTime, isPlaying: true })
          } else if (event.type === 'CHAT_MESSAGE') {
            socket.emit('wp:chat-persist', {
              roomCode,
              userId: memberId,
              displayName: event.message.senderName,
              content: event.message.content,
            })
          }
        }
        return // Short-circuit standard socket broadcast!
      } catch (err) {
        console.warn('[WP] LiveKit PublishData failed, falling back to Socket.IO', err)
      }
    }

    // ── 2. Fallback: Socket.IO Transport ──
    if (!socket) return

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
        // Not commonly used from client -> server yet, mostly server emits STATE_SYNC
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
    setLiveKitRoom,
    get isConnected() {
      return connected
    },
  }
}
