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
 * 2. Polling API for cross-network sync
 * 
 * TODO: Replace polling with WebSocket/Socket.IO for true realtime:
 *   - Install socket.io + socket.io-client
 *   - Create custom Next.js server with Socket.IO
 *   - Replace PollRealtimeChannel with SocketRealtimeChannel
 *   - The rest of the codebase needs zero changes
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
    playbackState?: string
    currentPlaybackTime?: number
    episodeId?: string
    serverIndex?: number
    memberCount?: number
    messageCount?: number
  } = {}

  async function poll() {
    try {
      const res = await fetch(`/api/watch-rooms/${roomCode}`)
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
        room: WatchRoom
        members: WatchRoomMember[]
        messages: WatchRoomMessage[]
      }

      const room = data.room

      // Detect state changes and emit events
      if (lastKnownState.playbackState !== undefined) {
        // Playback state changed
        if (lastKnownState.playbackState !== room.playbackState) {
          if (room.playbackState === 'playing') {
            handlers.forEach((h) =>
              h({ type: 'PLAY', currentTime: room.currentPlaybackTime, senderId: 'server' }),
            )
          } else {
            handlers.forEach((h) =>
              h({ type: 'PAUSE', currentTime: room.currentPlaybackTime, senderId: 'server' }),
            )
          }
        }

        // Time drift detected
        if (
          lastKnownState.currentPlaybackTime !== undefined &&
          Math.abs(room.currentPlaybackTime - lastKnownState.currentPlaybackTime) > 5
        ) {
          handlers.forEach((h) =>
            h({ type: 'SEEK', currentTime: room.currentPlaybackTime, senderId: 'server' }),
          )
        }

        // Episode changed
        if (lastKnownState.episodeId !== room.episodeId && room.episodeId) {
          handlers.forEach((h) =>
            h({ type: 'CHANGE_EPISODE', episodeSlug: room.episodeId!, senderId: 'server' }),
          )
        }

        // Server changed
        if (lastKnownState.serverIndex !== room.serverIndex) {
          handlers.forEach((h) =>
            h({ type: 'CHANGE_SERVER', serverIndex: room.serverIndex, senderId: 'server' }),
          )
        }

        // New messages
        if (lastKnownState.messageCount !== undefined && data.messages.length > lastKnownState.messageCount) {
          const newMessages = data.messages.slice(lastKnownState.messageCount)
          for (const msg of newMessages) {
            handlers.forEach((h) =>
              h({ type: 'CHAT_MESSAGE', message: msg }),
            )
          }
        }

        // Member changes
        if (lastKnownState.memberCount !== undefined && data.members.length !== lastKnownState.memberCount) {
          // Re-emit full state sync for member changes
          handlers.forEach((h) =>
            h({
              type: 'STATE_SYNC',
              currentTime: room.currentPlaybackTime,
              isPlaying: room.playbackState === 'playing',
              episodeSlug: room.episodeId,
              serverIndex: room.serverIndex,
              senderId: 'server',
            }),
          )
        }
      }

      lastKnownState = {
        playbackState: room.playbackState,
        currentPlaybackTime: room.currentPlaybackTime,
        episodeId: room.episodeId,
        serverIndex: room.serverIndex,
        memberCount: data.members.length,
        messageCount: data.messages.length,
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
      await fetch(`/api/watch-rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'playing', time: event.currentTime }),
      })
      break
    case 'PAUSE':
      await fetch(`/api/watch-rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'paused', time: event.currentTime }),
      })
      break
    case 'SEEK':
      await fetch(`/api/watch-rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: event.currentTime }),
      })
      break
    case 'CHANGE_EPISODE':
      await fetch(`/api/watch-rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: event.episodeSlug }),
      })
      break
    case 'CHANGE_SERVER':
      await fetch(`/api/watch-rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverIndex: event.serverIndex }),
      })
      break
    case 'CHAT_MESSAGE':
      await fetch(`/api/watch-rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: event.message.senderName,
          content: event.message.content,
          userId: event.message.senderId,
        }),
      })
      break
    // Other event types are local-only
    default:
      break
  }
}
