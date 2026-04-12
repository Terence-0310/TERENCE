'use client'

// ============================================
// CallDuoView — 2-person FaceTime-style layout
// ============================================
// Remote video = main area
// Self = small overlay bottom-right
// Control bar centered at bottom

import { useRef, useEffect } from 'react'
import { MicOff, VideoOff, User } from 'lucide-react'
import { CallControls } from './CallControls'

interface ParticipantInfo {
  name: string
  isMuted: boolean
  isCameraOn: boolean
  stream?: MediaStream | null
}

interface CallDuoViewProps {
  localUser: ParticipantInfo
  remoteUser?: ParticipantInfo | null
  onToggleMic: () => void
  onToggleCamera: () => void
  onLeave: () => void
  isConnecting?: boolean
}

export function CallDuoView({
  localUser,
  remoteUser,
  onToggleMic,
  onToggleCamera,
  onLeave,
  isConnecting = false,
}: CallDuoViewProps) {
  return (
    <div className="relative w-full aspect-video max-h-[280px] rounded-[18px] overflow-hidden bg-gradient-to-br from-[#0A0F1E] to-[#121A2F] border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
      {/* Remote video (main) */}
      {remoteUser ? (
        <div className="h-full w-full relative">
          {remoteUser.stream && remoteUser.isCameraOn ? (
            <VideoTile stream={remoteUser.stream} />
          ) : (
            <AvatarPlaceholder name={remoteUser.name} large />
          )}
          {/* Remote name + status */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            <span className="rounded-lg bg-black/50 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md shadow-lg">
              {remoteUser.name}
            </span>
            {remoteUser.isMuted && (
              <span className="rounded-full bg-red-500/80 p-1 shadow-lg ring-2 ring-red-500/20">
                <MicOff className="h-3 w-3 text-white" />
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 relative overflow-hidden">
          {/* Ambient glow in background while waiting */}
          <div className="absolute inset-0 bg-[#2DD4BF]/5 blur-[80px] rounded-full scale-150 animate-pulse pointer-events-none" />
          
          {isConnecting ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full border-[3px] border-[#2DD4BF]/20 border-t-[#2DD4BF] animate-spin shadow-[0_0_15px_rgba(45,212,191,0.3)]" />
              <span className="text-xs font-medium text-[#2DD4BF]/80 drop-shadow">Đang kết nối...</span>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-3 pointer-events-none">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
                <User className="h-6 w-6 text-white/30" />
              </div>
              <span className="text-xs font-medium text-white/40 tracking-wider">ĐANG CHỜ NGƯỜI KHÁC...</span>
            </div>
          )}
        </div>
      )}

      {/* Local video (small overlay - aesthetic PIP) */}
      <div className="absolute bottom-14 right-3 w-[110px] aspect-[4/3] rounded-[14px] overflow-hidden border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-[#0B1120] transition-transform duration-300 hover:scale-105 hover:border-white/40 z-20">
        {localUser.stream && localUser.isCameraOn ? (
          <VideoTile stream={localUser.stream} muted mirror />
        ) : (
          <AvatarPlaceholder name={localUser.name} />
        )}
        {localUser.isMuted && (
          <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 shadow-[0_2px_8px_rgba(239,68,68,0.5)] backdrop-blur-sm border border-white/20">
            <MicOff className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <CallControls
          isMuted={localUser.isMuted}
          isCameraOn={localUser.isCameraOn}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onLeave={onLeave}
          compact
        />
      </div>
    </div>
  )
}

// ── Video Tile (shared) ──

function VideoTile({
  stream,
  muted,
  mirror,
}: {
  stream: MediaStream
  muted?: boolean
  mirror?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="h-full w-full object-cover"
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}

// ── Avatar Placeholder ──

function AvatarPlaceholder({ name, large }: { name: string; large?: boolean }) {
  const size = large ? 'h-16 w-16 text-2xl' : 'h-8 w-8 text-xs'
  return (
    <div className="flex h-full items-center justify-center">
      <div className={`${size} flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary`}>
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}
