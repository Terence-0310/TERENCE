'use client'

// ============================================
// useWatchParty — Main Watch Party Hook
// ============================================
// Orchestrates realtime channel, sync service, and room state.
// Used by the WatchPartyPanel overlay on the watch page.

import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  WatchRoom,
  WatchRoomMember,
  WatchRoomMessage,
  WatchPartySyncEvent,
} from '@/lib/watch-party/types'
import { createRealtimeChannel } from '@/lib/watch-party/realtime'
import type { RealtimeChannel } from '@/lib/watch-party/realtime'
import { PlayerSyncService } from '@/lib/watch-party/sync-service'

// ── Types ──

export interface UseWatchPartyOptions {
  /** Room code to join */
  roomCode: string | null
  /** Current user info */
  user: { id: string; name: string }
  /** Is user the host? */
  isHost: boolean
  /** Does the room allow member control? */
  allowMemberControl?: boolean
  /** Player callbacks */
  onRemotePlay?: (time: number) => void
  onRemotePause?: (time: number) => void
  onRemoteSeek?: (time: number) => void
  onRemoteEpisodeChange?: (slug: string) => void
  onRemoteServerChange?: (index: number) => void
}

export interface UseWatchPartyReturn {
  // State
  room: WatchRoom | null
  members: WatchRoomMember[]
  messages: WatchRoomMessage[]
  isConnected: boolean
  isLoading: boolean

  // Actions
  sendChat: (text: string) => void
  localPlay: (time: number) => void
  localPause: (time: number) => void
  localSeek: (time: number) => void
  localChangeEpisode: (slug: string, name?: string) => void
  localChangeServer: (index: number) => void
  leaveRoom: () => void
  refresh: () => void
}

export function useWatchParty(options: UseWatchPartyOptions): UseWatchPartyReturn {
  const {
    roomCode,
    user,
    isHost,
    allowMemberControl = false,
    onRemotePlay,
    onRemotePause,
    onRemoteSeek,
    onRemoteEpisodeChange,
    onRemoteServerChange,
  } = options

  const [room, setRoom] = useState<WatchRoom | null>(null)
  const [members, setMembers] = useState<WatchRoomMember[]>([])
  const [messages, setMessages] = useState<WatchRoomMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberId, setMemberId] = useState<string>('')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const syncRef = useRef<PlayerSyncService | null>(null)

  // ── Join room + setup channel ──
  useEffect(() => {
    if (!roomCode) return

    let cancelled = false

    async function init() {
      if (!roomCode) return // TypeScript narrows roomCode to string below
      const code = roomCode // narrowed local for use in async scope
      setIsLoading(true)

      try {
        // Join room via API
        const joinRes = await fetch('/api/watch-rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            userId: user.id,
            displayName: user.name,
          }),
        })

        if (!joinRes.ok) {
          console.error('[useWatchParty] Failed to join room')
          setIsLoading(false)
          return
        }

        const joinData = await joinRes.json()
        if (cancelled) return

        setRoom(joinData.room)
        setMemberId(joinData.member.id)

        // Fetch full room state
        const stateRes = await fetch(`/api/watch-rooms/${code}`)
        if (stateRes.ok) {
          const stateData = await stateRes.json()
          if (cancelled) return
          setRoom(stateData.room)
          setMembers(stateData.members)
          setMessages(stateData.messages)
        }

        // Create realtime channel
        const channel = createRealtimeChannel(code, joinData.member.id)
        channelRef.current = channel

        // Create sync service
        const sync = new PlayerSyncService({
          channel,
          memberId: joinData.member.id,
          isHost,
          allowMemberControl,
          onRemotePlay,
          onRemotePause,
          onRemoteSeek,
          onRemoteEpisodeChange,
          onRemoteServerChange,
          onRoomClosed: (reason) => {
            console.log('[useWatchParty] Room closed:', reason)
            setRoom(null)
          },
        })
        syncRef.current = sync

        // Listen for chat messages and member updates via the channel
        channel.onEvent((event: WatchPartySyncEvent) => {
          if (event.type === 'CHAT_MESSAGE') {
            setMessages((prev) => {
              // Deduplicate by id
              if (prev.some((m) => m.id === event.message.id)) return prev
              return [...prev, event.message]
            })
          }
          if (event.type === 'MEMBER_JOIN') {
            setMembers((prev) => {
              if (prev.some((m) => m.id === event.member.id)) return prev
              return [...prev, event.member]
            })
          }
          if (event.type === 'MEMBER_LEAVE') {
            setMembers((prev) => prev.filter((m) => m.id !== event.memberId))
          }
          // Update room state from STATE_SYNC
          if (event.type === 'STATE_SYNC' || event.type === 'PLAY' || event.type === 'PAUSE' || event.type === 'SEEK') {
            setRoom((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                currentPlaybackTime: event.currentTime,
                playbackState: event.type === 'PLAY' ? 'playing' : event.type === 'PAUSE' ? 'paused' : prev.playbackState,
              }
            })
          }
        })

        setIsLoading(false)
      } catch (err) {
        console.error('[useWatchParty] Init error:', err)
        setIsLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      syncRef.current?.destroy()
      syncRef.current = null
      channelRef.current?.disconnect()
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, user.id])

  // ── Actions ──

  const sendChat = useCallback((text: string) => {
    if (!roomCode || !text.trim()) return

    const message: WatchRoomMessage = {
      id: `local-${Date.now()}`,
      roomCode,
      senderId: user.id,
      senderName: user.name,
      type: 'chat',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    }

    // Optimistic update
    setMessages((prev) => [...prev, message])

    // Send via channel
    channelRef.current?.send({
      type: 'CHAT_MESSAGE',
      message,
    })
  }, [roomCode, user.id, user.name])

  const localPlay = useCallback((time: number) => {
    syncRef.current?.localPlay(time)
  }, [])

  const localPause = useCallback((time: number) => {
    syncRef.current?.localPause(time)
  }, [])

  const localSeek = useCallback((time: number) => {
    syncRef.current?.localSeek(time)
  }, [])

  const localChangeEpisode = useCallback((slug: string, name?: string) => {
    syncRef.current?.localChangeEpisode(slug, name)
  }, [])

  const localChangeServer = useCallback((index: number) => {
    syncRef.current?.localChangeServer(index)
  }, [])

  const leaveRoom = useCallback(async () => {
    if (!roomCode || !memberId) return
    try {
      await fetch('/api/watch-rooms/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, memberId }),
      })
    } catch {
      // Non-critical
    }
    syncRef.current?.destroy()
    channelRef.current?.disconnect()
    setRoom(null)
    setMembers([])
    setMessages([])
  }, [roomCode, memberId])

  const refresh = useCallback(async () => {
    if (!roomCode) return
    try {
      const res = await fetch(`/api/watch-rooms/${roomCode}`)
      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)
        setMembers(data.members)
        setMessages(data.messages)
      }
    } catch {
      // Silent
    }
  }, [roomCode])

  return {
    room,
    members,
    messages,
    isConnected: channelRef.current?.isConnected ?? false,
    isLoading,
    sendChat,
    localPlay,
    localPause,
    localSeek,
    localChangeEpisode,
    localChangeServer,
    leaveRoom,
    refresh,
  }
}
