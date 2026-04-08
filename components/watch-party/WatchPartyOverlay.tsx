'use client'

// ============================================
// WatchPartyOverlay — Integrates watch party into the watch page
// ============================================
// Wraps the player area and adds:
// - Create/join watch party button
// - Watch party panel (slides in from right)
// - Syncs player events to the party

import { useState, useCallback, useRef, useEffect } from 'react'
import { useWatchParty } from '@/hooks/useWatchParty'
import { usePartyCall } from '@/hooks/usePartyCall'
import { WatchPartyPanel } from '@/components/watch-party/WatchPartyPanel'
import { CreateWatchPartyButton } from '@/components/watch-party/CreateWatchPartyButton'
import { WatchPartyContext } from '@/components/watch-party/WatchPartyContext'
import { Users, X } from 'lucide-react'

// ── Types ──

interface WatchPartyOverlayProps {
  /** The player content (children) */
  children: React.ReactNode
  /** Current movie context */
  movieId: string
  movieSlug: string
  movieTitle: string
  episodeId?: string
  episodeSlug?: string
  episodeName?: string
  serverIndex?: number
  posterUrl?: string
  /** Video element ref for syncing */
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

// Generate a simple guest user ID (persisted in sessionStorage)
function getGuestUser(): { id: string; name: string } {
  if (typeof window === 'undefined') return { id: 'guest', name: 'Khách' }

  let userId = sessionStorage.getItem('terence:guest-id')
  if (!userId) {
    userId = `guest-${Math.random().toString(36).substring(2, 8)}`
    sessionStorage.setItem('terence:guest-id', userId)
  }

  let userName = sessionStorage.getItem('terence:guest-name')
  if (!userName) {
    const names = ['Khách', 'Người xem', 'Cinephile', 'MovieFan']
    userName = names[Math.floor(Math.random() * names.length)] + ' ' + userId.slice(-3)
    sessionStorage.setItem('terence:guest-name', userName)
  }

  return { id: userId, name: userName }
}

export function WatchPartyOverlay({
  children,
  movieId,
  movieSlug,
  movieTitle,
  episodeId,
  episodeSlug,
  episodeName,
  serverIndex = 0,
  posterUrl,
  videoRef,
}: WatchPartyOverlayProps) {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)
  const user = useRef(getGuestUser()).current

  // ── Watch Party Hook ──
  const party = useWatchParty({
    roomCode,
    user,
    isHost: true, // Host by default if creating; joining sets isHost from server
    allowMemberControl: false,
    onRemotePlay: (time) => {
      const video = videoRef?.current
      if (!video) return
      if (Math.abs(video.currentTime - time) > 2) {
        video.currentTime = time
      }
      video.play().catch(() => {})
    },
    onRemotePause: (time) => {
      const video = videoRef?.current
      if (!video) return
      video.pause()
      if (Math.abs(video.currentTime - time) > 2) {
        video.currentTime = time
      }
    },
    onRemoteSeek: (time) => {
      const video = videoRef?.current
      if (!video) return
      video.currentTime = time
    },
    onRemoteEpisodeChange: (slug) => {
      // Navigate to new episode
      window.location.href = `/watch/${movieSlug}?ep=${slug}`
    },
    onRemoteServerChange: (_index) => {
      // Server change handled by player
    },
  })

  // ── Call Hook ──
  const call = usePartyCall({
    roomCode,
    memberId: user.id,
    memberName: user.name,
    roomType: party.room?.roomType ?? 'small_group',
    enabled: !!roomCode,
  })

  // ── Create Room Handler ──
  const handleRoomCreated = useCallback((code: string) => {
    setRoomCode(code)
    setShowPanel(true)
  }, [])

  // ── Join Room Handler ──
  const handleJoin = useCallback(() => {
    if (!joinInput.trim()) return
    setRoomCode(joinInput.trim().toUpperCase())
    setShowPanel(true)
    setShowJoinInput(false)
    setJoinInput('')
  }, [joinInput])

  // ── Leave Room Handler ──
  const handleLeave = useCallback(() => {
    party.leaveRoom()
    call.leaveCall()
    setRoomCode(null)
    setShowPanel(false)
  }, [party, call])

  useEffect(() => {
    const handleRoomCreatedEvent = (e: Event) => {
      const code = (e as CustomEvent).detail
      handleRoomCreated(code)
    }
    window.addEventListener('terence:room-created', handleRoomCreatedEvent)
    return () => {
      window.removeEventListener('terence:room-created', handleRoomCreatedEvent)
    }
  }, [handleRoomCreated])

  // Not in a room — show the join UI
  if (!roomCode) {
    return (
      <WatchPartyContext.Provider value={null}>
        <div className="relative h-full w-full group/overlay">
          {children}

          {/* Floating watch party join controls */}
        <div className="absolute right-4 top-4 z-50 flex flex-col items-end gap-2 transition-opacity duration-300" style={{ zIndex: 60 }}>
          {/* Join room button */}
          {showJoinInput ? (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 backdrop-blur-md">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Mã phòng..."
                className="w-20 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
                autoFocus
              />
              <button
                onClick={handleJoin}
                className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary transition hover:bg-primary/30"
              >
                Vào
              </button>
              <button
                onClick={() => { setShowJoinInput(false); setJoinInput('') }}
                className="rounded-full p-1 text-white/40 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowJoinInput(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-white/60 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
              title="Tham gia phòng xem chung"
            >
              Vào phòng
            </button>
          )}
        </div>
      </div>
      </WatchPartyContext.Provider>
    )
  }

  // In a room — show player + panel
  return (
    <WatchPartyContext.Provider value={{
      localPlay: party.localPlay,
      localPause: party.localPause,
      localSeek: party.localSeek
    }}>
      <div className="flex h-full w-full bg-black flex-col lg:flex-row overflow-hidden relative">
        {/* Player area */}
        <div className="flex-1 relative h-full min-h-[50vh] flex flex-col group/overlay">
          {children}

          {/* Room indicator (when panel is hidden) */}
          {!showPanel && (
            <button
              onClick={() => setShowPanel(true)}
              className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary backdrop-blur-md transition-all duration-300 hover:bg-primary/20 opacity-0 group-hover/overlay:opacity-100 shadow-lg"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{party.room?.roomName || 'Xem chung'}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold">
                {party.members.filter((m) => m.isOnline).length}
              </span>
            </button>
          )}
        </div>

        {/* Watch Party Panel (Flex sibling for true split layout) */}
        {showPanel && party.room && (
          <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#0A0E17] flex flex-col h-full z-10 transition-all duration-300">
            <WatchPartyPanel
              room={party.room}
              members={party.members}
              messages={party.messages}
              isHost={true}
              userId={user.id}
              userName={user.name}
              onSendChat={party.sendChat}
              onLeave={handleLeave}
              onClose={() => setShowPanel(false)}
              call={call}
            />
          </div>
        )}
      </div>
    </WatchPartyContext.Provider>
  )
}
