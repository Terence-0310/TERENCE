'use client'

// ============================================
// Watch Party — Realtime Transport Layer
// ============================================
// Abstraction for realtime communication in watch party rooms.
//
// Current implementation: Polling + BroadcastChannel (zero-dependency).
// The API surface is designed for easy swap to WebSocket/Socket.IO later.
//
// Architecture:
// - RealtimeChannel: represents a connection to a room
// - Uses SWR-style polling for cross-network sync (via Next.js API routes)
// - Uses BroadcastChannel for instant same-browser tab sync
// - Emits typed events via a simple callback system

import type { WatchPartySyncEvent, WatchRoomMessage, WatchRoomMember, WatchRoom } from './types'
import { POLL_FALLBACK_INTERVAL_MS } from './constants'

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
  /** Whether channel is connected */
  isConnected: boolean
}

// ── BroadcastChannel + Polling Implementation ──

/**
 * Create a realtime channel for a watch party room.
 * 
 * Current strategy:
 * 1. BroadcastChannel for instant same-browser sync
 * 2. Polling API for cross-network sync (via /api/watch-party/[roomCode])
 */
export function createRealtimeChannel(
  roomCode: string,
  memberId: string,
): RealtimeChannel {
  const handlers = new Set<RealtimeEventHandler>()
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let broadcastChannel: BroadcastChannel | null = null
  let connected = false

  // ── BroadcastChannel (same-browser instant sync) ──
  try {
    broadcastChannel = new BroadcastChannel(`terence:watch-party:${roomCode}`)
    broadcastChannel.onmessage = (event) => {
      const data = event.data as WatchPartySyncEvent
      // Don't process our own events
      if ('senderId' in data && data.senderId === memberId) return
      handlers.forEach((h) => h(data))
    }
  } catch {
    // BroadcastChannel not available (e.g., older browsers)
  }

  // ── Polling (cross-network sync) ──
  let lastKnownState: {
    playbackTime?: number
    isPlaying?: boolean
    episodeId?: string | null
    version?: number
    participantCount?: number
  } = {}

  let seenMessageIds = new Set<string>()

  async function poll() {
    try {
      const res = await fetch(`/api/watch-party/${roomCode}`)
      if (!res.ok) {
        if (res.status === 404) {
          handlers.forEach((h) =>
            h({ type: 'ROOM_CLOSED', reason: 'Room not found' }),
          )
          disconnect()
        }
        return
      }

      const data = await res.json() as {
        room: any
        participants: any[]
        state: any
        messages: WatchRoomMessage[]
      }

      const state = data.state

      // Detect state changes and emit events
      if (state && lastKnownState.version !== undefined) {
        if (lastKnownState.version !== state.version) {
          // State version changed — emit appropriate event
          if (state.lastEventType === 'PLAY') {
            handlers.forEach((h) =>
              h({ type: 'PLAY', currentTime: state.playbackTime, senderId: 'server' }),
            )
          } else if (state.lastEventType === 'PAUSE') {
            handlers.forEach((h) =>
              h({ type: 'PAUSE', currentTime: state.playbackTime, senderId: 'server' }),
            )
          } else if (state.lastEventType === 'SEEK') {
            handlers.forEach((h) =>
              h({ type: 'SEEK', currentTime: state.playbackTime, senderId: 'server' }),
            )
          } else if (state.lastEventType === 'CHANGE_EPISODE') {
            handlers.forEach((h) =>
              h({ type: 'CHANGE_EPISODE', episodeSlug: state.episodeId!, senderId: 'server' }),
            )
          } else {
            // Generic state sync
            handlers.forEach((h) =>
              h({
                type: 'STATE_SYNC',
                currentTime: state.playbackTime,
                isPlaying: state.isPlaying,
                episodeSlug: state.episodeId,
                serverIndex: 0,
                senderId: 'server',
              }),
            )
          }
        }
      }

      // Member changes
      if (lastKnownState.participantCount !== undefined && data.participants.length !== lastKnownState.participantCount) {
        handlers.forEach((h) =>
          h({
            type: 'STATE_SYNC',
            currentTime: state?.playbackTime ?? 0,
            isPlaying: state?.isPlaying ?? false,
            episodeSlug: state?.episodeId,
            serverIndex: 0,
            senderId: 'server',
          }),
        )
      }

      // New Messages
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          if (!seenMessageIds.has(msg.id)) {
            seenMessageIds.add(msg.id)
            // Don't process our own events via polling because BroadcastChannel handles our own optimistically
            if (msg.senderId !== memberId) {
              handlers.forEach((h) => h({ type: 'CHAT_MESSAGE', message: msg }))
            }
          }
        })
      }

      lastKnownState = {
        playbackTime: state?.playbackTime,
        isPlaying: state?.isPlaying,
        episodeId: state?.episodeId,
        version: state?.version,
        participantCount: data.participants.length,
      }
    } catch {
      // Network error — silent, will retry on next poll
    }
  }

  // Start polling
  function connect() {
    if (connected) return
    connected = true
    // Initial sync
    poll()
    // Start polling
    pollTimer = setInterval(poll, POLL_FALLBACK_INTERVAL_MS)
  }

  function disconnect() {
    connected = false
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (broadcastChannel) {
      broadcastChannel.close()
      broadcastChannel = null
    }
    handlers.clear()
  }

  function send(event: WatchPartySyncEvent) {
    // Broadcast to same-browser tabs instantly
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(event)
      } catch {
        // BroadcastChannel serialization error
      }
    }

    // Send to server via API (so polling clients pick it up)
    sendToServer(roomCode, event).catch(() => {
      // Non-critical — other clients will eventually sync via polling
    })
  }

  // Auto-connect
  connect()

  return {
    roomCode,
    send,
    onEvent: (handler) => handlers.add(handler),
    offEvent: (handler) => handlers.delete(handler),
    disconnect,
    get isConnected() { return connected },
  }
}

// ── Server API dispatcher ──

async function sendToServer(roomCode: string, event: WatchPartySyncEvent): Promise<void> {
  switch (event.type) {
    case 'PLAY':
      await fetch(`/api/watch-party/${roomCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPlaying: true, playbackTime: event.currentTime, eventType: 'PLAY' }),
      })
      break
    case 'PAUSE':
      await fetch(`/api/watch-party/${roomCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPlaying: false, playbackTime: event.currentTime, eventType: 'PAUSE' }),
      })
      break
    case 'SEEK':
      await fetch(`/api/watch-party/${roomCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbackTime: event.currentTime, eventType: 'SEEK' }),
      })
      break
    case 'CHANGE_EPISODE':
      await fetch(`/api/watch-party/${roomCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: event.episodeSlug, eventType: 'CHANGE_EPISODE' }),
      })
      break
    case 'CHANGE_SERVER':
      await fetch(`/api/watch-party/${roomCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'CHANGE_SERVER' }),
      })
      break
    case 'CHAT_MESSAGE':
      await fetch(`/api/watch-party/${roomCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: event.message.senderName,
          content: event.message.content,
          participantId: event.message.senderId,
        }),
      })
      break
    // Other event types are local-only
    default:
      break
  }
}
