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
    <div className="relative w-full aspect-video max-h-[280px] rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.06]">
      {/* Remote video (main) */}
      {remoteUser ? (
        <div className="h-full w-full relative">
          {remoteUser.stream && remoteUser.isCameraOn ? (
            <VideoTile stream={remoteUser.stream} />
          ) : (
            <AvatarPlaceholder name={remoteUser.name} large />
          )}
          {/* Remote name + status */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
              {remoteUser.name}
            </span>
            {remoteUser.isMuted && (
              <span className="rounded-full bg-red-500/80 p-0.5">
                <MicOff className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          {isConnecting ? (
            <>
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-xs text-white/40">Đang kết nối...</span>
            </>
          ) : (
            <>
              <User className="h-10 w-10 text-white/10" />
              <span className="text-xs text-white/30">Đang chờ người khác...</span>
            </>
          )}
        </div>
      )}

      {/* Local video (small overlay) */}
      <div className="absolute bottom-12 right-2 w-[100px] aspect-video rounded-lg overflow-hidden border border-white/20 shadow-lg bg-zinc-800">
        {localUser.stream && localUser.isCameraOn ? (
          <VideoTile stream={localUser.stream} muted mirror />
        ) : (
          <AvatarPlaceholder name={localUser.name} />
        )}
        {localUser.isMuted && (
          <div className="absolute bottom-0.5 right-0.5 rounded-full bg-red-500/80 p-0.5">
            <MicOff className="h-2 w-2 text-white" />
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
