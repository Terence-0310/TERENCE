'use client'

// ============================================
// CallControls — Glass-style control bar
// ============================================
// Pill-shaped bar with mic/camera/leave controls.
// Google Meet mini style.

import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'

interface CallControlsProps {
  isMuted: boolean
  isCameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onLeave: () => void
  /** Compact mode for inline panel usage */
  compact?: boolean
}

export function CallControls({
  isMuted,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  compact = false,
}: CallControlsProps) {
  const btnSize = compact ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={`
      inline-flex items-center gap-2 rounded-full
      bg-black/60 backdrop-blur-xl border border-white/[0.08]
      ${compact ? 'px-2 py-1' : 'px-3 py-2'}
      shadow-[0_8px_32px_rgba(0,0,0,0.4)]
    `}>
      {/* Mic toggle */}
      <button
        onClick={onToggleMic}
        className={`${btnSize} flex items-center justify-center rounded-full transition-all ${
          isMuted
            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600'
            : 'bg-white/15 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] hover:bg-white/25 hover:scale-105'
        }`}
        title={isMuted ? 'Bật mic' : 'Tắt mic'}
      >
        {isMuted ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
      </button>

      {/* Camera toggle */}
      <button
        onClick={onToggleCamera}
        className={`${btnSize} flex items-center justify-center rounded-full transition-all ${
          !isCameraOn
            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600'
            : 'bg-white/15 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] hover:bg-white/25 hover:scale-105'
        }`}
        title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
      >
        {isCameraOn ? <Video className={iconSize} /> : <VideoOff className={iconSize} />}
      </button>

      {/* Leave call */}
      <button
        onClick={onLeave}
        className={`${btnSize} flex items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600 shadow-lg shadow-red-500/30`}
        title="Rời cuộc gọi"
      >
        <PhoneOff className={iconSize} />
      </button>
    </div>
  )
}
