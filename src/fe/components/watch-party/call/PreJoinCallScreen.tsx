'use client'

// ============================================
// PreJoinCallScreen — Camera/mic preview before joining
// ============================================
// Shows a preview of the user's camera and mic
// with a clear "Join Call" button. Not the call itself.
// Separated from in-call UI for clean UX.

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, Phone, Loader2, AlertCircle } from 'lucide-react'

interface PreJoinCallScreenProps {
  userName: string
  onJoin: (settings: { audioEnabled: boolean; videoEnabled: boolean }) => void
  onCancel: () => void
  isConnecting?: boolean
}

export function PreJoinCallScreen({
  userName,
  onJoin,
  onCancel,
  isConnecting = false,
}: PreJoinCallScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Acquire media on mount
  useEffect(() => {
    let cancelled = false

    async function acquireMedia() {
      setIsLoading(true)
      setPermissionError(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
        if (!cancelled) {
          setLocalStream(stream)
          setIsLoading(false)
        }
      } catch (err) {
        if (cancelled) return
        // Try audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (!cancelled) {
            setLocalStream(audioStream)
            setVideoEnabled(false)
            setIsLoading(false)
          }
        } catch {
          if (!cancelled) {
            setPermissionError('Không thể truy cập camera/mic. Hãy kiểm tra quyền trình duyệt.')
            setIsLoading(false)
          }
        }
      }
    }

    acquireMedia()
    return () => {
      cancelled = true
    }
  }, [])

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop())
    }
  }, [localStream])

  const toggleAudio = useCallback(() => {
    if (!localStream) return
    const track = localStream.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setAudioEnabled(track.enabled)
    }
  }, [localStream])

  const toggleVideo = useCallback(() => {
    if (!localStream) return
    const track = localStream.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setVideoEnabled(track.enabled)
    }
  }, [localStream])

  const handleJoin = () => {
    // Stop preview stream before joining (LiveKit will create its own)
    localStream?.getTracks().forEach((t) => t.stop())
    setLocalStream(null)
    onJoin({ audioEnabled, videoEnabled })
  }

  const hasVideo = localStream?.getVideoTracks().some((t) => t.readyState === 'live') ?? false

  return (
    <div className="flex flex-col items-center gap-5 p-6 rounded-2xl bg-background border border-white/[0.08]">
      {/* Video Preview */}
      <div className="relative w-full max-w-[320px] aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.06]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 text-white/20 animate-spin" />
          </div>
        ) : hasVideo && videoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-white/40">{userName}</span>
          </div>
        )}

        {/* Name badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/70 backdrop-blur-sm">
          {userName}
        </div>
      </div>

      {/* Permission Error */}
      {permissionError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {permissionError}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleAudio}
          disabled={isLoading}
          className={`rounded-full p-3 transition ${
            audioEnabled
              ? 'bg-white/10 text-white hover:bg-white/15'
              : 'bg-red-500/20 text-red-400'
          }`}
          title={audioEnabled ? 'Tắt mic' : 'Bật mic'}
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleVideo}
          disabled={isLoading || !hasVideo}
          className={`rounded-full p-3 transition ${
            videoEnabled && hasVideo
              ? 'bg-white/10 text-white hover:bg-white/15'
              : 'bg-red-500/20 text-red-400'
          } disabled:opacity-30`}
          title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
        >
          {videoEnabled && hasVideo ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 w-full max-w-[320px]">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/5 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/10"
        >
          Hủy
        </button>
        <button
          onClick={handleJoin}
          disabled={isConnecting || (!!permissionError && !localStream)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang kết nối...
            </>
          ) : (
            <>
              <Phone className="h-3.5 w-3.5" />
              Tham gia
            </>
          )}
        </button>
      </div>
    </div>
  )
}
