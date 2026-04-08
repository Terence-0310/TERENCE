'use client'

// ============================================
// Watch Party Room Page — Phase 2 Full Experience
// ============================================
// /xem-chung/[code]
// Player + Chat + Members + LiveKit Call + Sync

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, Loader2, Copy, Check,
  MessageCircle, Phone, PhoneOff, Mic, MicOff,
  Video, VideoOff, Send, Crown, Monitor, Smile,
} from 'lucide-react'
import Link from 'next/link'
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom'
import { WatchPlayer, type WatchPlayerRef } from '@/components/watch/WatchPlayer'
import { useWatchSync, type ChatMessage } from '@/hooks/useWatchSync'

// ── Reaction emoji config ──
const REACTION_EMOJIS = ['😂', '❤️', '🔥', '👏', '😮', '😢', '💯', '🎬']

interface FloatingReaction {
  id: number
  emoji: string
  x: number // percentage
}

let reactionIdCounter = 0

// ── Types ──

interface RoomData {
  id: string
  roomCode: string
  title: string
  status: string
  movieId: string | null
  episodeId: string | null
  hostUserId: string | null
  host: { id: string; name: string; avatar?: string } | null
  movie?: { id: string; title?: string; posterUrl?: string | null; backdropUrl?: string | null } | null
  createdAt: string
  lastSyncedAt: string | null
}

interface ParticipantData {
  id: string
  displayName: string
  role: string
  isOnline: boolean
  joinedAt: string
}

interface StateData {
  playbackTime: number
  isPlaying: boolean
  playbackRate: number
  episodeId: string | null
  lastEventType: string | null
  lastEventBy: string | null
  version: number
  updatedAt: string
}

interface MessageData {
  id: string
  participantId: string | null
  senderName: string
  type: string
  content: string
  createdAt: string
}

// ── Guest user ──

function getGuestUser(): { id: string; name: string } {
  if (typeof window === 'undefined') return { id: 'guest', name: 'Khách' }
  let uid = sessionStorage.getItem('terence:wp-id')
  if (!uid) {
    uid = `g-${Math.random().toString(36).substring(2, 8)}`
    sessionStorage.setItem('terence:wp-id', uid)
  }
  let name = sessionStorage.getItem('terence:wp-name')
  if (!name) {
    name = 'Khách ' + uid.slice(-3)
    sessionStorage.setItem('terence:wp-name', name)
  }
  return { id: uid, name }
}

// ── Polling interval ──
const POLL_INTERVAL = 2500

export default function WatchRoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string)?.toUpperCase()
  const user = useRef(getGuestUser())

  // ── Core state ──
  const [room, setRoom] = useState<RoomData | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [state, setState] = useState<StateData | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [myParticipantId, setMyParticipantId] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── UI state ──
  const [panelTab, setPanelTab] = useState<'chat' | 'members'>('chat')
  const [showPanel, setShowPanel] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [showReactionBar, setShowReactionBar] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lastPollRef = useRef<string | null>(null)

  // ── Player ref (imperative control via WatchPlayer) ──
  const playerRef = useRef<WatchPlayerRef>(null)
  const [syncStatus, setSyncStatus] = useState<'waiting' | 'synced' | 'resyncing'>('waiting')
  const [socketReady, setSocketReady] = useState(false)

  // ── LiveKit ──
  const liveKit = useLiveKitRoom({
    roomCode: code ?? null,
    userName: user.current.name,
    userId: user.current.id,
    enabled: !!code,
  })
  const liveKitParticipantCount = (liveKit.connectionState === 'connected')
    ? liveKit.remoteParticipants.length + 1
    : 0

  // Auto-join LiveKit when room loads (audio only)
  const liveKitAutoJoined = useRef(false)
  useEffect(() => {
    if (!loading && !error && room && !liveKitAutoJoined.current) {
      liveKitAutoJoined.current = true
      // Slight delay to let room fully render
      const timer = setTimeout(() => {
        liveKit.connect(true, false).catch(() => {})
      }, 1500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, room])

  // ════════════════════════════════════════════
  // 1. JOIN ROOM on mount
  // ── Socket.IO Sync ──
  const watchSync = useWatchSync({
    roomCode: code,
    userId: user.current.id,
    displayName: user.current.name,
    isHost,
    enabled: socketReady,
    onPlay: (currentTime) => {
      const p = playerRef.current
      if (!p) return
      p.seekTo(currentTime)
      p.play()
      setSyncStatus('synced')
    },
    onPause: (currentTime) => {
      const p = playerRef.current
      if (!p) return
      p.seekTo(currentTime)
      p.pause()
      setSyncStatus('synced')
    },
    onSeek: (currentTime) => {
      playerRef.current?.seekTo(currentTime)
      setSyncStatus('synced')
    },
    onStateSync: (syncState) => {
      const p = playerRef.current
      if (!p) return
      if (Math.abs(p.getCurrentTime() - syncState.playbackTime) > 3) {
        p.seekTo(syncState.playbackTime)
      }
      if (syncState.isPlaying) p.play()
      else p.pause()
      setSyncStatus('synced')
    },
    onTimeRequest: () => {
      const p = playerRef.current
      if (!p) return null
      const video = p.getVideo()
      return {
        currentTime: p.getCurrentTime(),
        isPlaying: video ? !video.paused : false,
      }
    },
    onChatMessage: (msg: ChatMessage) => {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        if (ids.has(msg.id)) return prev
        return [...prev, {
          id: msg.id,
          participantId: msg.senderId,
          senderName: msg.senderName,
          type: msg.type,
          content: msg.content,
          createdAt: msg.createdAt,
        }]
      })
    },
    onHostChanged: (newHostId, _newHostName) => {
      setIsHost(user.current.id === newHostId)
    },
    onUserJoined: (_userId, _displayName, count) => {
      // Will be reflected in next metadata poll
      console.log(`[WP] User joined, count: ${count}`)
    },
    onUserLeft: (_userId, _displayName, count) => {
      console.log(`[WP] User left, count: ${count}`)
    },
  })

  // ════════════════════════════════════════════
  useEffect(() => {
    if (!code) return
    let cancelled = false

    async function init() {
      try {
        // Join
        const joinRes = await fetch('/api/watch-party/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: code,
            displayName: user.current.name,
          }),
        })

        if (!joinRes.ok) {
          const err = await joinRes.json().catch(() => ({}))
          setError(err.error || 'Không thể tham gia phòng')
          setLoading(false)
          return
        }

        const joinData = await joinRes.json()
        if (cancelled) return

        setMyParticipantId(joinData.participant.id)
        setIsHost(joinData.participant.role === 'HOST')

        // Fetch full room state
        const roomRes = await fetch(`/api/watch-party/${code}`)
        if (roomRes.ok) {
          const roomData = await roomRes.json()
          if (cancelled) return
          setRoom(roomData.room)
          setParticipants(roomData.participants)
          setState(roomData.state)
        }

        // Fetch messages
        const msgRes = await fetch(`/api/watch-party/${code}/messages`)
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          if (cancelled) return
          setMessages(msgData.messages)
          if (msgData.messages.length > 0) {
            lastPollRef.current = msgData.messages[msgData.messages.length - 1].createdAt
          }
        }

        setLoading(false)
      } catch {
        setError('Lỗi kết nối')
        setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [code])

  // ════════════════════════════════════════════
  // 2. METADATA POLL (reduced — socket handles sync/chat)
  // ════════════════════════════════════════════
  useEffect(() => {
    if (!code || loading || error) return

    // Enable socket once room is loaded
    if (!socketReady) setSocketReady(true)

    const timer = setInterval(async () => {
      try {
        // Poll room metadata + participants only
        const res = await fetch(`/api/watch-party/${code}`)
        if (!res.ok) return
        const data = await res.json()

        setRoom(data.room)
        setParticipants(data.participants)

        // Update state version from server
        if (data.state) setState(data.state as StateData)

        // Check if host changed (DB source of truth)
        const me = data.participants.find((p: ParticipantData) => p.id === myParticipantId)
        if (me) setIsHost(me.role === 'HOST')

        // Room ended?
        if (data.room.status === 'ENDED') {
          setError('Phòng đã kết thúc')
        }
      } catch {
        // Silent retry
      }
    }, 10_000) // Reduced to 10s — socket handles real-time sync

    return () => clearInterval(timer)
  }, [code, loading, error, myParticipantId, socketReady])

  // WatchPlayer handles HLS init internally — just sync initial state when ready
  useEffect(() => {
    if (!room || !state || !playerRef.current) return
    // Apply initial state on mount (delayed to let player init)
    const timer = setTimeout(() => {
      const p = playerRef.current
      if (!p) return
      if (state.playbackTime > 0) p.seekTo(state.playbackTime)
      if (state.isPlaying) p.play()
      setSyncStatus('synced')
    }, 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════

  // Player sync callbacks (called by WatchPlayer → emit via Socket.IO)
  const handlePlayerPlay = useCallback((currentTime: number) => {
    // Socket.IO instant broadcast
    watchSync.emitPlay(currentTime)
    // Also persist to DB for recovery
    fetch(`/api/watch-party/${code}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playbackTime: currentTime, isPlaying: true,
        eventType: 'PLAY', eventBy: myParticipantId,
      }),
    }).catch(() => {})
    setSyncStatus('synced')
  }, [code, myParticipantId, watchSync])

  const handlePlayerPause = useCallback((currentTime: number) => {
    watchSync.emitPause(currentTime)
    fetch(`/api/watch-party/${code}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playbackTime: currentTime, isPlaying: false,
        eventType: 'PAUSE', eventBy: myParticipantId,
      }),
    }).catch(() => {})
    setSyncStatus('synced')
  }, [code, myParticipantId, watchSync])

  const handlePlayerSeeked = useCallback((currentTime: number) => {
    setSyncStatus('resyncing')
    watchSync.emitSeek(currentTime)
    fetch(`/api/watch-party/${code}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playbackTime: currentTime,
        eventType: 'SEEK', eventBy: myParticipantId,
      }),
    }).then(() => setSyncStatus('synced')).catch(() => {})
  }, [code, myParticipantId, watchSync])

  // Chat — via Socket.IO (instant) + REST fallback
  function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !code) return

    const content = chatInput.trim().slice(0, 1000)
    setChatInput('')

    // Send via Socket.IO for instant delivery
    if (watchSync.status === 'connected') {
      watchSync.sendChat(content)
    }

    // Also persist to DB
    fetch(`/api/watch-party/${code}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: myParticipantId,
        senderName: user.current.name,
        content,
      }),
    }).catch(() => {})
  }

  // Copy invite link
  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/xem-chung/${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Leave room
  async function handleLeave() {
    // Socket.IO disconnect (instant)
    watchSync.leave()
    // REST cleanup (persistent)
    if (code && myParticipantId) {
      fetch('/api/watch-party/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, participantId: myParticipantId }),
      }).catch(() => {})
    }
    liveKit.disconnect()
    router.push('/xem-chung')
  }

  // ════════════════════════════════════════════
  // RENDERS
  // ════════════════════════════════════════════

  const onlineCount = useMemo(() => participants.filter((p) => p.isOnline).length, [participants])

  // ── LOADING ──
  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
            <Users className="w-6 h-6 text-primary/60 absolute inset-0 m-auto" />
          </div>
          <p className="text-white/50 text-sm">Đang kết nối phòng <span className="font-mono text-primary">{code}</span></p>
        </div>
      </main>
    )
  }

  // ── ERROR / NOT FOUND ──
  if (error || !room) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-5 max-w-sm px-6">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-white/15" />
          </div>
          <h2 className="text-xl font-bold text-white">{error || 'Không tìm thấy phòng'}</h2>
          <p className="text-sm text-white/40">
            Phòng <span className="font-mono text-primary">{code}</span> không tồn tại hoặc đã kết thúc.
          </p>
          <Link
            href="/xem-chung"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
        </div>
      </main>
    )
  }

  const isLive = room.status === 'ACTIVE'
  const isVideoPlaying = state?.isPlaying ?? false

  // ── Reaction handler ──
  function handleReaction(emoji: string) {
    const id = ++reactionIdCounter
    const x = 10 + Math.random() * 80
    setFloatingReactions(prev => [...prev, { id, emoji, x }])
    // Send to others via socket chat
    if (watchSync.status === 'connected') {
      watchSync.sendChat(emoji)
    }
    // Auto-clean after animation
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id))
    }, 2500)
  }

  // ════════════════════════════════════════════
  // MAIN UI
  // ════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-[#020617] relative">
      {/* ═══ TOP BAR ═══ */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-black/60 backdrop-blur-md z-30 relative">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/xem-chung')} className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/50 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{room.title}</h1>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <span>Mã: <span className="font-mono text-primary">{code}</span></span>
              {isHost && <span className="text-amber-400 flex items-center gap-0.5"><Crown className="w-3 h-3" /> Host</span>}
            </div>
          </div>

          {/* ── Participant Avatars (compact strip) ── */}
          {participants.length > 0 && (
            <div className="hidden md:flex items-center gap-0 ml-3">
              {participants.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold border-2 border-[#020617] transition-transform hover:scale-110 hover:z-10 ${
                    p.role === 'HOST'
                      ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 text-amber-400 ring-1 ring-amber-500/30'
                      : p.isOnline
                        ? 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                        : 'bg-white/5 text-white/30'
                  }`}
                  style={{ marginLeft: i > 0 ? '-6px' : '0', zIndex: 5 - i }}
                  title={p.id === myParticipantId ? 'Bạn' : p.displayName}
                >
                  {p.displayName.charAt(0).toUpperCase()}
                  {p.isOnline && (
                    <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-emerald-400 border border-[#020617]" />
                  )}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border-2 border-[#020617] text-[9px] font-medium text-white/40" style={{ marginLeft: '-6px' }}>
                  +{participants.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sync badge */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            syncStatus === 'synced' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
            syncStatus === 'resyncing' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
            'bg-white/5 text-white/40 border border-white/[0.06]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'resyncing' ? 'bg-amber-400 animate-pulse' : 'bg-white/30'
            }`} />
            {syncStatus === 'synced' ? 'Đồng bộ' : syncStatus === 'resyncing' ? 'Sync...' : 'Chờ'}
          </span>

          {isLive && (
            isVideoPlaying ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> PAUSED
              </span>
            )
          )}

          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
            <Users className="w-3 h-3" /> {onlineCount}
          </span>

          <button onClick={handleCopy} className="p-1.5 rounded-lg bg-white/5 border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/10 transition" title="Copy link mời">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* LiveKit call indicator */}
          {liveKit.connectionState === 'connected' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <Phone className="w-3 h-3" /> {liveKitParticipantCount}
            </span>
          )}
          {liveKit.connectionState === 'connecting' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Gọi...
            </span>
          )}

          <button onClick={() => setShowPanel(!showPanel)} className={`p-1.5 rounded-lg transition ${showPanel ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <div className="flex h-[calc(100vh-45px)]">
        {/* ── Player ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-black">
            <WatchPlayer
              ref={playerRef}
              streamUrl={null}
              poster={null}
              isHost={isHost}
              title={room.title}
              autoPlay={true}
              onPlay={handlePlayerPlay}
              onPause={handlePlayerPause}
              onSeeked={handlePlayerSeeked}
            />
          </div>

          {/* Info bar with poster blur */}
          <div className="border-t border-white/[0.06] relative overflow-hidden">
            {/* Blurred poster background */}
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.07] blur-sm scale-110" style={{ backgroundImage: room.movie?.posterUrl ? `url(${room.movie.posterUrl})` : 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a] via-[#0a0e1a]/90 to-[#0a0e1a]" />
            <div className="relative px-4 py-2.5 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white truncate">{room.title}</h2>
                <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-2">
                  {state && (
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${state.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {state.isPlaying ? '▶ Playing' : '⏸ Paused'} • {Math.floor(state.playbackTime)}s
                    </span>
                  )}
                  {room.host && <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400/60" /> {room.host.name}</span>}
                </p>
              </div>
              {/* Quick reaction bar */}
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button
                  onClick={() => setShowReactionBar(!showReactionBar)}
                  className={`p-1.5 rounded-lg transition text-xs ${showReactionBar ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                  title="Reactions"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showReactionBar && (
                  <div className="flex items-center gap-0.5 bg-[#0B1120] border border-white/[0.08] rounded-xl px-2 py-1 shadow-xl animate-in slide-in-from-right-2">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm hover:bg-white/10 hover:scale-125 transition-all duration-150 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating reactions */}
          {floatingReactions.length > 0 && (
            <div className="absolute bottom-16 left-0 right-0 pointer-events-none z-50" style={{ height: '200px' }}>
              {floatingReactions.map((r) => (
                <span
                  key={r.id}
                  className="absolute text-2xl animate-float-up"
                  style={{ left: `${r.x}%`, bottom: 0 }}
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Side Panel ── */}
        {showPanel && (
          <div className="w-80 lg:w-96 flex flex-col border-l border-white/[0.06] bg-[#0B1120] shrink-0">
            
            {/* ── CALL AREA (ALWAYS ON TOP) ── */}
            <div className="border-b border-white/[0.06]">
              {liveKit.connectionState === 'disconnected' && (
                <div className="px-4 py-3 flex gap-2">
                  <button onClick={() => liveKit.connect(true, true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0B2520] border border-[#145C4B] py-2.5 text-xs font-bold text-[#2DD4BF] transition hover:bg-[#145C4B]/50"
                  >
                    <Video className="w-4 h-4" /> Bật Video
                  </button>
                  <button onClick={() => liveKit.connect(true, false)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/[0.08] py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/10"
                  >
                    <Mic className="w-4 h-4" /> Chỉ Loa thoại
                  </button>
                </div>
              )}

              {liveKit.connectionState === 'connecting' && (
                <div className="text-center py-4 space-y-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
                  <p className="text-[10px] text-white/40">Đang kết nối...</p>
                </div>
              )}

              {liveKit.connectionState === 'connected' && (
                <div className="p-3 space-y-2 bg-[#060A14]">
                  <div className={`grid gap-2 ${liveKit.remoteParticipants.length === 0 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <VideoTile name={user.current.name} isMuted={liveKit.isMuted} isCameraOn={liveKit.isCameraOn}
                      videoTrack={liveKit.localParticipant?.videoTrack} isSpeaking={liveKit.localParticipant?.isSpeaking ?? false} isLocal />
                    {liveKit.remoteParticipants.map((p) => (
                      <VideoTile key={p.identity} name={p.name} isMuted={p.isMuted} isCameraOn={p.isCameraOn}
                        videoTrack={p.videoTrack} audioTrack={p.audioTrack} isSpeaking={p.isSpeaking} />
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button onClick={liveKit.toggleMic}
                      className={`h-9 w-9 flex items-center justify-center rounded-full transition ${liveKit.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>
                      {liveKit.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={liveKit.toggleCamera}
                      className={`h-9 w-9 flex items-center justify-center rounded-full transition ${!liveKit.isCameraOn ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>
                      {liveKit.isCameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={liveKit.disconnect}
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg shadow-red-500/30">
                      <PhoneOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {liveKit.error && <p className="px-4 pb-2 text-[10px] text-center text-red-400/80">{liveKit.error}</p>}
            </div>

            {/* Tabs (Only Chat & Members now) */}
            <div className="flex border-b border-white/[0.06] shrink-0">
              {(['chat', 'members'] as const).map((tab) => (
                <button key={tab} onClick={() => setPanelTab(tab)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${panelTab === tab ? 'border-b-2 border-primary text-primary' : 'text-white/40 hover:text-white/60'}`}
                >
                  {tab === 'chat' && <><MessageCircle className="inline w-3.5 h-3.5 mr-1" />Chat</>}
                  {tab === 'members' && <><Users className="inline w-3.5 h-3.5 mr-1" />Thành viên ({onlineCount})</>}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {/* ── CHAT ── */}
              {panelTab === 'chat' && (
                <div className="flex h-full flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-hide">
                    {messages.length === 0 && (
                      <p className="py-12 text-center text-xs text-white/20">Chưa có tin nhắn.</p>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.type === 'system' ? (
                          <p className="py-1 text-center text-[10px] text-white/20 italic">— {msg.content} —</p>
                        ) : (
                          <div className={`rounded-lg px-3 py-2 ${
                            msg.participantId === myParticipantId
                              ? 'ml-8 bg-primary/10 border border-primary/20'
                              : 'mr-8 bg-white/[0.04] border border-white/[0.06]'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-primary/70">{msg.senderName}</span>
                              <span className="text-[9px] text-white/15">
                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-white/65">{msg.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendChat} className="border-t border-white/[0.06] px-3 py-2.5">
                    <div className="flex gap-2">
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Nhập tin nhắn..." maxLength={1000}
                        className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-primary/40 transition"
                      />
                      <button type="submit" disabled={!chatInput.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/20 text-primary transition hover:bg-primary/30 disabled:opacity-20"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── MEMBERS ── */}
              {panelTab === 'members' && (
                <div className="overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-hide">
                  {participants.map((p) => {
                    // Check if this participant is speaking in LiveKit
                    const liveKitP = liveKit.remoteParticipants.find(lp => lp.name === p.displayName)
                    const isSpeaking = liveKitP?.isSpeaking || (
                      p.id === myParticipantId && liveKit.localParticipant?.isSpeaking
                    )
                    const isInCall = liveKit.connectionState === 'connected' && (
                      liveKitP || p.id === myParticipantId
                    )
                    return (
                      <div key={p.id}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition hover:bg-white/[0.05] ${
                          isSpeaking
                            ? 'border-emerald-500/30 bg-emerald-500/[0.04] shadow-sm shadow-emerald-500/5'
                            : 'border-white/[0.04] bg-white/[0.02]'
                        }`}
                      >
                        <div className="relative">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isSpeaking ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-400/40 animate-pulse'
                            : p.role === 'HOST' ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400'
                            : 'bg-primary/10 text-primary'
                          }`}>
                            {p.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B1120] ${p.isOnline ? 'bg-emerald-400' : 'bg-white/20'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-white/80">
                              {p.id === myParticipantId ? 'Bạn' : p.displayName}
                            </span>
                            {p.role === 'HOST' && <Crown className="h-3 w-3 text-amber-400" />}
                            {p.role === 'GUEST' && <span className="text-[9px] text-white/20">Khách</span>}
                            {isSpeaking && <span className="text-[9px] text-emerald-400 font-medium">🔊</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/25">{p.isOnline ? 'Đang xem' : 'Offline'}</span>
                            {isInCall && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400/60">
                                <Phone className="w-2.5 h-2.5" /> Trong cuộc gọi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>

            {/* Panel footer */}
            <div className="border-t border-white/[0.06] px-4 py-2.5">
              <button onClick={handleLeave}
                className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
              >
                Rời phòng
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ════════════════════════════════════════════
// Video Tile Component
// ════════════════════════════════════════════

function VideoTile({ name, isMuted, isCameraOn, videoTrack, audioTrack, isSpeaking, isLocal }: {
  name: string; isMuted: boolean; isCameraOn: boolean
  videoTrack?: MediaStreamTrack; audioTrack?: MediaStreamTrack
  isSpeaking: boolean; isLocal?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoRef.current.srcObject = new MediaStream([videoTrack])
    }
  }, [videoTrack])

  useEffect(() => {
    if (audioRef.current && audioTrack && !isLocal) {
      audioRef.current.srcObject = new MediaStream([audioTrack])
    }
  }, [audioTrack, isLocal])

  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-zinc-900 border transition ${
      isSpeaking ? 'border-emerald-500/40 shadow-md shadow-emerald-500/10' : 'border-white/[0.08]'
    }`}>
      {videoTrack && isCameraOn ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="h-full w-full object-cover"
          style={isLocal ? { transform: 'scaleX(-1)' } : undefined} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            isSpeaking ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/15 text-primary'
          }`}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      {audioTrack && !isLocal && <audio ref={audioRef} autoPlay />}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white/70 truncate max-w-[80%] backdrop-blur-sm">
          {isLocal ? 'Bạn' : name}{isSpeaking && ' 🔊'}
        </span>
        {isMuted && <span className="rounded-full bg-red-500/80 p-0.5"><MicOff className="h-2.5 w-2.5 text-white" /></span>}
      </div>
    </div>
  )
}
