'use client'

// ============================================
// CallDuoView — 2-person FaceTime-style layout
// ============================================
// Remote video = main area
// Self = small overlay bottom-right
// Control bar centered at bottom

import { useRef, useEffect } from 'react'
import { MicOff, User } from 'lucide-react'
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
    <div className="relative w-full max-h-[280px] rounded-[18px] overflow-hidden bg-gradient-to-br from-[#0A0F1E] to-[#121A2F] border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
      {/* 50/50 split — equal tiles for both participants */}
      <div className="grid grid-cols-2 gap-1 aspect-video">
        {/* Local */}
        <div className="relative bg-black/40 overflow-hidden rounded-l-[14px]">
          {localUser.stream && localUser.isCameraOn ? (
            <VideoTile stream={localUser.stream} muted mirror />
          ) : (
            <AvatarPlaceholder name={localUser.name} large />
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
            <span className="rounded-md bg-black/60 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
              Bạn
            </span>
            {localUser.isMuted && (
              <span className="rounded-full bg-red-500/80 p-0.5 shadow-lg">
                <MicOff className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
        </div>

        {/* Remote */}
        <div className="relative bg-black/40 overflow-hidden rounded-r-[14px]">
          {remoteUser ? (
            <>
              {remoteUser.stream && remoteUser.isCameraOn ? (
                <VideoTile stream={remoteUser.stream} />
              ) : (
                <AvatarPlaceholder name={remoteUser.name} large />
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                <span className="rounded-md bg-black/60 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                  {remoteUser.name}
                </span>
                {remoteUser.isMuted && (
                  <span className="rounded-full bg-red-500/80 p-0.5 shadow-lg">
                    <MicOff className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              {isConnecting ? (
                <>
                  <div className="h-10 w-10 rounded-full border-[3px] border-primary/20 border-t-[#2DD4BF] animate-spin" />
                  <span className="text-[11px] font-medium text-primary/80">Đang kết nối...</span>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <User className="h-5 w-5 text-white/30" />
                  </div>
                  <span className="text-[10px] font-medium text-white/40 tracking-wide text-center px-2">
                    ĐANG CHỜ
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls — overlay at bottom center, outside the grid */}
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
