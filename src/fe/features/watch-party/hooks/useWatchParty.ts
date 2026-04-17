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

import { io, Socket } from 'socket.io-client'

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
  pendingRequests: {userId: string; displayName: string; socketId: string}[]
  isConnected: boolean
  isLoading: boolean
  isLockedOut: boolean

  // Actions
  sendChat: (text: string) => void
  localPlay: (time: number) => void
  localPause: (time: number) => void
  localSeek: (time: number) => void
  localChangeEpisode: (slug: string, name?: string) => void
  localChangeServer: (index: number) => void
  leaveRoom: () => void
  refresh: () => void
  requestJoin: () => void
  toggleLock: (locked: boolean) => void
  approveJoin: (userId: string, targetSocketId: string) => void
  rejectJoin: (userId: string, targetSocketId: string) => void
  kickMember: (targetId: string) => void
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
  const [isLockedOut, setIsLockedOut] = useState(false)
  const [isWaitlistApproved, setIsWaitlistApproved] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<{userId: string; displayName: string; socketId: string}[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const syncRef = useRef<PlayerSyncService | null>(null)
  const lobbySocketRef = useRef<Socket | null>(null)

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
        const joinRes = await fetch('/api/watch-party/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: code,
            userId: user.id,
            displayName: user.name,
            isApproved: isWaitlistApproved,
          }),
        })

        if (!joinRes.ok) {
          const errData = await joinRes.json().catch(() => null)
          if (errData?.code === 'ROOM_LOCKED') {
            setIsLockedOut(true)
          } else {
            console.error('[useWatchParty] Failed to join room')
          }
          setIsLoading(false)
          return
        }

        const joinData = await joinRes.json()
        if (cancelled) return

        setRoom(joinData.room)
        setMemberId(joinData.participant.id)

        // Fetch full room state
        const stateRes = await fetch(`/api/watch-party/${code}`)
        if (stateRes.ok) {
          const stateData = await stateRes.json()
          if (cancelled) return
          setRoom(stateData.room)
          setMembers(stateData.participants ?? [])
          setMessages(stateData.messages ?? [])
        }

        // Create realtime channel
        const channel = createRealtimeChannel(code, joinData.participant.id)
        channelRef.current = channel

        // Create sync service
        const sync = new PlayerSyncService({
          channel,
          memberId: joinData.participant.id,
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

        // Listen for raw events (Lock state, join requests)
        channel.onRaw('wp:lock-changed', (data: { isLocked: boolean }) => {
          setRoom((prev) => prev ? { ...prev, isLocked: data.isLocked } : prev)
        })

        if (isHost) {
          channel.onRaw('wp:join-request', (data: { userId: string; displayName: string; socketId: string }) => {
            setPendingRequests((prev) => {
              if (prev.some(p => p.userId === data.userId)) return prev
              return [...prev, data]
            })
          })
        }

        channel.onRaw('wp:kicked', (data: { message: string }) => {
          alert(`Thông báo: ${data.message}`)
          window.location.href = '/' // Kick user entirely to home
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
    if (!roomCode || !text.trim() || !memberId) return

    const message: WatchRoomMessage = {
      id: `local-${Date.now()}`,
      roomCode,
      senderId: memberId,
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
  }, [roomCode, user.id, user.name, memberId])

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
      await fetch('/api/watch-party/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, participantId: memberId }),
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
      const res = await fetch(`/api/watch-party/${roomCode}`)
      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)
        setMembers(data.participants ?? [])
        setMessages(data.messages ?? [])
      }
    } catch {
      // Silent
    }
  }, [roomCode])

  const requestJoin = useCallback(() => {
    if (!roomCode || !user.id || !isLockedOut) return

    // Create a temporary lobby socket to ask host
    const socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })

    lobbySocketRef.current = socket

    socket.on('connect', () => {
      socket.emit('wp:request-join', {
        roomCode,
        userId: user.id,
        displayName: user.name,
        socketId: socket.id,
      })
    })

    socket.on('wp:join-approved', () => {
      setIsWaitlistApproved(true)
      setIsLockedOut(false)
      socket.disconnect()
    })

    socket.on('wp:join-rejected', () => {
      alert('Chủ phòng đã từ chối yêu cầu tham gia của bạn.')
      socket.disconnect()
    })
  }, [roomCode, user.id, user.name, isLockedOut])

  const toggleLock = useCallback((locked: boolean) => {
    if (!roomCode || !memberId) return
    channelRef.current?.emitRaw('wp:toggle-lock', { roomCode, userId: user.id, isLocked: locked })
  }, [roomCode, memberId, user.id])

  const approveJoin = useCallback((targetUserId: string, targetSocketId: string) => {
    if (!roomCode || !memberId) return
    channelRef.current?.emitRaw('wp:approve-join', { roomCode, userId: targetUserId, hostId: user.id, targetSocketId })
    setPendingRequests((prev) => prev.filter(p => p.userId !== targetUserId))
  }, [roomCode, memberId, user.id])

  const rejectJoin = useCallback((targetUserId: string, targetSocketId: string) => {
    if (!roomCode || !memberId) return
    channelRef.current?.emitRaw('wp:reject-join', { roomCode, userId: targetUserId, hostId: user.id, targetSocketId })
    setPendingRequests((prev) => prev.filter(p => p.userId !== targetUserId))
  }, [roomCode, memberId, user.id])

  const kickMember = useCallback((targetId: string) => {
    if (!roomCode || !memberId) return
    channelRef.current?.emitRaw('wp:kick', { roomCode, hostId: user.id, targetId })
  }, [roomCode, memberId, user.id])

  return {
    room,
    members,
    messages,
    pendingRequests,
    isConnected: channelRef.current?.isConnected ?? false,
    isLoading,
    isLockedOut,
    sendChat,
    localPlay,
    localPause,
    localSeek,
    localChangeEpisode,
    localChangeServer,
    leaveRoom,
    refresh,
    requestJoin,
    toggleLock,
    approveJoin,
    rejectJoin,
    kickMember,
  }
}
