'use client'

// ============================================
// CallGridView — 3-4 person grid layout
// ============================================
// 2x2 grid with video/avatar tiles.
// Each tile shows name + mic status overlay.
// Designed to work inside the WatchPartyPanel.

import { useRef, useEffect } from 'react'
import { MicOff } from 'lucide-react'
import { CallControls } from './CallControls'

interface GridParticipant {
  id: string
  name: string
  isMuted: boolean
  isCameraOn: boolean
  stream?: MediaStream | null
  isLocal?: boolean
}

interface CallGridViewProps {
  participants: GridParticipant[]
  onToggleMic: () => void
  onToggleCamera: () => void
  onLeave: () => void
  localMuted: boolean
  localCameraOn: boolean
}

export function CallGridView({
  participants,
  onToggleMic,
  onToggleCamera,
  onLeave,
  localMuted,
  localCameraOn,
}: CallGridViewProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Grid */}
      <div className={`grid gap-1.5 ${
        participants.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'
      }`}>
        {participants.map((p) => (
          <div
            key={p.id}
            className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900 border border-white/[0.08]"
          >
            {p.stream && p.isCameraOn ? (
              <GridVideoTile stream={p.stream} muted={p.isLocal} mirror={p.isLocal} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Overlay: name + mic status */}
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm truncate max-w-[80%]">
                {p.isLocal ? 'Bạn' : p.name}
              </span>
              {p.isMuted && (
                <span className="rounded-full bg-red-500/80 p-0.5">
                  <MicOff className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center pt-1">
        <CallControls
          isMuted={localMuted}
          isCameraOn={localCameraOn}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onLeave={onLeave}
          compact
        />
      </div>
    </div>
  )
}

// ── Video Tile ──

function GridVideoTile({
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
