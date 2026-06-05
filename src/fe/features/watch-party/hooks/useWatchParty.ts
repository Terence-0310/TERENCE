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
} from '@/lib/watch-party/types'
import { createRealtimeChannel } from '@/lib/watch-party/realtime'
import type { RealtimeChannel } from '@/lib/watch-party/realtime'
import { PlayerSyncService } from '@/lib/watch-party/sync-service'
import { toast } from 'sonner'
import { logger } from '@/src/fe/lib/logger'

import { Socket } from 'socket.io-client'

const log = logger.child({ module: 'useWatchParty' })

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
  /**
   * Called when the server asks THIS client (the host) to report the
   * current playback position. The host should return `{currentTime,
   * isPlaying}` from its video element so the joiner can sync to where
   * the host is right now (not stale state from last play/pause event).
   */
  onTimeRequest?: () => { currentTime: number; isPlaying: boolean } | null
  /** LiveKit Room for SFU DataChannel transport */
  livekitRoom?: any
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
  setTheme: (theme: string) => void
  approveJoin: (userId: string, targetSocketId: string) => void
  rejectJoin: (userId: string, targetSocketId: string) => void
  kickMember: (targetId: string) => void
  updateRole: (targetId: string, role: 'COHOST' | 'MEMBER') => void
  setLiveKitRoom: (room: any) => void
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
    onTimeRequest,
    livekitRoom,
  } = options

  // Keep the latest onTimeRequest in a ref so the socket listener (registered
  // once on join) always sees the freshest video element state.
  const onTimeRequestRef = useRef(onTimeRequest)
  useEffect(() => { onTimeRequestRef.current = onTimeRequest }, [onTimeRequest])

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
            // Surface the server reason (e.g. ROOM_FULL "Phòng đã đầy…") so the
            // user understands why the join was rejected instead of nothing.
            toast.error(errData?.error || 'Không thể tham gia phòng')
            log.error({ code: errData?.code }, 'Failed to join room')
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
        const canManage = joinData.participant?.role === 'HOST' || joinData.participant?.role === 'COHOST'
        const sync = new PlayerSyncService({
          channel,
          memberId: joinData.participant.id,
          isHost: canManage,
          allowMemberControl,
          onRemotePlay,
          onRemotePause,
          onRemoteSeek,
          onRemoteEpisodeChange,
          onRemoteServerChange,
          onRoomClosed: (reason) => {
            log.info({ reason }, 'Room closed')
            setRoom(null)
          },
        })
        syncRef.current = sync

        // Listen for chat messages and member updates via the channel
        channel.onEvent((event: any) => {
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
              toast.success(`${event.member.guestName || 'Một người xem'} đã tham gia phòng`)
              return [...prev, event.member]
            })
          }
          if (event.type === 'MEMBER_LEAVE') {
            setMembers((prev) => {
              const member = prev.find((m) => m.id === event.memberId)
              if (member) {
                toast.info(`${member.guestName || 'Một người xem'} đã rời phòng`)
              }
              return prev.filter((m) => m.id !== event.memberId)
            })
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
          
          if (isHost && event.type === 'JOIN_REQUEST') {
            setPendingRequests((prev) => {
              if (prev.some(p => p.userId === event.participant.id)) return prev
              return [...prev, { userId: event.participant.id, displayName: event.participant.displayName, socketId: '' }]
            })
            toast.info(`${event.participant.displayName} muốn tham gia phòng`)
          }
        })

        // Listen for raw events (Lock state, join requests)
        channel.onRaw('wp:lock-changed', (data: { isLocked: boolean }) => {
          setRoom((prev) => {
            if (prev) {
              if (data.isLocked && !prev.isLocked) toast.warning('Chủ phòng đã khoá phòng')
              if (!data.isLocked && prev.isLocked) toast.success('Phòng đã được mở khoá')
            }
            return prev ? { ...prev, isLocked: data.isLocked } : prev
          })
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

        // Server asks THIS client (only the host receives this) for the
        // live playback position whenever a new member joins. Read directly
        // from the video element via onTimeRequestRef and emit wp:sync-time,
        // which the server then broadcasts as `wp:state` to the joiner so
        // they seek to where the host actually is right now.
        channel.onRaw('wp:request-time', () => {
          const data = onTimeRequestRef.current?.()
          if (!data) return
          channel.emitRaw('wp:sync-time', {
            roomCode: code,
            userId: user.id,
            currentTime: data.currentTime,
            isPlaying: data.isPlaying,
          })
        })

        setIsLoading(false)
      } catch (err) {
        log.error({ err: err instanceof Error ? err.message : err }, 'Init error')
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

  const setLiveKitRoomAction = useCallback((room: any) => {
    if (channelRef.current && typeof channelRef.current.setLiveKitRoom === 'function') {
      channelRef.current.setLiveKitRoom(room || null)
    }
  }, [])

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

  const [pendingParticipantId, setPendingParticipantId] = useState<string | null>(null)

  const requestJoin = useCallback(async () => {
    if (!roomCode || !user.id || !isLockedOut) return

    try {
      const res = await fetch(`/api/watch-party/${roomCode}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: user.name, userId: user.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setPendingParticipantId(data.participant?.id)
        toast.success('Đã gửi yêu cầu tham gia. Vui lòng chờ chủ phòng duyệt.')
      } else {
        toast.error('Không thể gửi yêu cầu tham gia.')
      }
    } catch (e) {
      toast.error('Lỗi khi gửi yêu cầu tham gia.')
    }
  }, [roomCode, user.id, user.name, isLockedOut])

  // Poll for approval status
  useEffect(() => {
    if (!isLockedOut || !roomCode || !pendingParticipantId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/watch-party/${roomCode}`)
        if (res.ok) {
          const data = await res.json()
          const me = data.participants?.find((p: any) => p.id === pendingParticipantId)
          if (me?.status === 'ACTIVE') {
            setIsWaitlistApproved(true)
            setIsLockedOut(false)
            setPendingParticipantId(null)
          } else if (me?.status === 'REJECTED') {
            alert('Chủ phòng đã từ chối yêu cầu tham gia của bạn.')
            setPendingParticipantId(null)
            setIsLockedOut(false)
          }
        }
      } catch (e) {
        // Network blip is expected during waitlist polling; keep retrying
        // on subsequent tick but surface the issue so it's debuggable.
        log.warn({ err: e instanceof Error ? e.message : e }, 'Poll waitlist status failed')
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isLockedOut, roomCode, pendingParticipantId])

  const toggleLock = useCallback(async (locked: boolean) => {
    if (!roomCode || !memberId) return
    try {
      await fetch(`/api/watch-party/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: locked, participantId: memberId }),
      })
      // The local room state will update via LiveKit or fallback polling, but we can optimistically set it
      setRoom(prev => prev ? { ...prev, isLocked: locked } : prev)
    } catch (e) {
      toast.error('Lỗi khi thay đổi trạng thái khoá phòng')
    }
  }, [roomCode, memberId])

  const setTheme = useCallback(async (theme: string) => {
    if (!roomCode || !memberId) return
    // Optimistic — apply locally, then persist.
    setRoom((prev) => (prev ? { ...prev, theme } : prev))
    try {
      const res = await fetch(`/api/watch-party/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, participantId: memberId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        toast.error(d?.error || 'Không thể đổi theme phòng')
      }
    } catch {
      toast.error('Lỗi khi đổi theme phòng')
    }
  }, [roomCode, memberId])

  const approveJoin = useCallback(async (targetUserId: string, _targetSocketId: string) => {
    if (!roomCode || !memberId) return
    try {
      const res = await fetch(`/api/watch-party/${roomCode}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', hostParticipantId: memberId, targetParticipantId: targetUserId }),
      })
      if (res.ok) {
        setPendingRequests((prev) => prev.filter(p => p.userId !== targetUserId))
      }
    } catch (e) {
      toast.error('Lỗi khi duyệt người dùng')
    }
  }, [roomCode, memberId])

  const rejectJoin = useCallback(async (targetUserId: string, _targetSocketId: string) => {
    if (!roomCode || !memberId) return
    try {
      const res = await fetch(`/api/watch-party/${roomCode}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', hostParticipantId: memberId, targetParticipantId: targetUserId }),
      })
      if (res.ok) {
        setPendingRequests((prev) => prev.filter(p => p.userId !== targetUserId))
      }
    } catch (e) {
      toast.error('Lỗi khi từ chối người dùng')
    }
  }, [roomCode, memberId])

  const kickMember = useCallback(async (targetId: string) => {
    // If you have a kick endpoint, call it. For now, we simulate or you can implement it later.
    if (!roomCode || !memberId) return
    toast.info('Tính năng kick chưa được kết nối API đầy đủ')
  }, [roomCode, memberId])

  const updateRole = useCallback(async (targetUserId: string, role: 'COHOST' | 'MEMBER') => {
    if (!roomCode || !memberId) return
    try {
      const res = await fetch(`/api/watch-party/${roomCode}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostParticipantId: memberId, targetParticipantId: targetUserId, role }),
      })
      if (res.ok) {
        toast.success(`Đã cấp quyền ${role === 'COHOST' ? 'Co-host' : 'Member'} thành công`)
        // The member's role will be updated via STATE_SYNC or polling
      } else {
        toast.error('Không thể thay đổi quyền')
      }
    } catch (e) {
      toast.error('Lỗi khi thay đổi quyền')
    }
  }, [roomCode, memberId])

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
    setTheme,
    approveJoin,
    rejectJoin,
    kickMember,
    updateRole,
    setLiveKitRoom: setLiveKitRoomAction,
  }
}

