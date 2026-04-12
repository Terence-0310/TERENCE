'use client'

// ============================================
// BasePlayer — Shared Player Controls Foundation
// ============================================
// Sprint 6: Minimal, reusable presentational component for player controls.
// Encapsulates the UI shell that is duplicated across all player components.
//
// What it provides:
//   - Container shell with auto-hide controls on mouse idle
//   - Play/Pause button
//   - Volume/Mute controls with slider
//   - Progress bar (clickable with buffer display)
//   - Time display (currentTime / duration)
//   - Fullscreen toggle
//   - Loading spinner overlay
//   - Big play button overlay (when paused)
//   - Error overlay with retry button
//
// What it does NOT handle (specialized per player):
//   - HLS initialization / source loading
//   - Watch party host/viewer sync
//   - Server switching
//   - Resume prompt
//   - Settings menus (speed, subtitles, quality)
//   - Keyboard shortcuts (delegated via onKeyAction prop)
//
// USAGE:
//   <BasePlayer
//     videoRef={videoRef}
//     isPlaying={isPlaying}
//     currentTime={currentTime}
//     duration={duration}
//     ...
//   >
//     {/* Slot for overlays: resume prompt, settings menu, etc. */}
//   </BasePlayer>

import { useRef, useState, useEffect, useCallback, type ReactNode, type RefObject } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Loader2, AlertTriangle,
  RotateCcw, RotateCw,
} from 'lucide-react'
import { formatTime } from '@/lib/player/time-format'

// ── Props ──

export interface BasePlayerProps {
  /** Ref to the <video> element (managed by parent) */
  videoRef: RefObject<HTMLVideoElement | null>

  // ── Playback state (driven by parent) ──
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  buffered: number

  // ── Error state ──
  hasError: boolean
  errorMessage: string
  onRetry?: () => void

  // ── Optional extra error action (e.g. "try alternate source") ──
  extraErrorAction?: ReactNode

  // ── Controls ──
  onTogglePlay: () => void
  onSeek: (time: number) => void

  // ── Buttons inserted after play/pause, before volume (e.g. next episode) ──
  leftControls?: ReactNode

  // ── Additional control buttons inserted between spacer and fullscreen ──
  rightControls?: ReactNode

  // ── Optional slot rendered above controls (e.g. server badge) ──
  topOverlay?: ReactNode

  // ── Optional custom loading overlay (replaces default spinner) ──
  loadingOverlay?: ReactNode

  // ── Children rendered inside the container (overlays: resume, settings, etc.) ──
  children?: ReactNode

  // ── Paused center play button ──
  showBigPlayButton?: boolean
}

// ── Component ──

export function BasePlayer({
  videoRef,
  isPlaying, isLoading, currentTime, duration, buffered,
  hasError, errorMessage, onRetry, extraErrorAction,
  onTogglePlay, onSeek,
  leftControls, rightControls, topOverlay, loadingOverlay, children,
  showBigPlayButton = true,
}: BasePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSeekTime = useRef(0)

  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Derived ──
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0

  // ── Volume ──
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [videoRef])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const vol = Number(e.target.value)
    video.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }, [videoRef])

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    // Let the fullscreenchange event update state — no optimistic setState
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    // Safari support
    document.addEventListener('webkitfullscreenchange', cb)
    return () => {
      document.removeEventListener('fullscreenchange', cb)
      document.removeEventListener('webkitfullscreenchange', cb)
    }
  }, [])

  // ── Progress bar click ──
  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const time = Math.max(0, Math.min((x / rect.width) * duration, duration))
    onSeek(time)
  }, [duration, onSeek])

  // ── Auto-hide controls ──
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const video = videoRef.current
      if (!video) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          onTogglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft': {
          e.preventDefault()
          // Throttle rapid key repeat to max 1 seek per 150ms
          const now = Date.now()
          if (now - lastSeekTime.current < 150) break
          lastSeekTime.current = now
          onSeek(Math.max(0, video.currentTime - 10))
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const now = Date.now()
          if (now - lastSeekTime.current < 150) break
          lastSeekTime.current = now
          onSeek(Math.min(video.duration || 0, video.currentTime + 10))
          break
        }
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          setVolume(video.volume)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          setVolume(video.volume)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videoRef, onTogglePlay, onSeek, toggleFullscreen, toggleMute])

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    }
  }, [])

  // ══════════════════════════════════
  // RENDER
  // ══════════════════════════════════

  // ── Error state ──
  if (hasError) {
    return (
      <div ref={containerRef} className="relative flex h-full flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">{errorMessage}</p>
            <p className="mt-1 text-xs text-white/40">Kiểm tra kết nối mạng hoặc thử nguồn phát khác.</p>
          </div>
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                Thử lại
              </button>
            )}
            {extraErrorAction}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black group/player"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Top overlay slot (server badge, host badge, etc.) */}
      {topOverlay}

      {/* Children slot (overlays: resume prompt, settings menu, etc.) */}
      {children}

      {/* Loading spinner */}
      {isLoading && (loadingOverlay || (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
            <p className="text-xs text-white/40 animate-pulse">Đang tải...</p>
          </div>
        </div>
      ))}

      {/* Big play button (when paused) */}
      {showBigPlayButton && !isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/90 shadow-2xl shadow-primary/30 animate-scale-in">
            <Play className="h-7 w-7 fill-white text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Gradient */}
        <div className="h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 space-y-2">
          {/* Progress bar */}
          <div
            className="group/progress relative h-1.5 cursor-pointer rounded-full bg-white/15 transition-all hover:h-2.5"
            onClick={handleProgressBarClick}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/20"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow-lg shadow-primary/30 opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Button row */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Backward 10s */}
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
              className="text-white hover:text-primary transition p-1"
              title="Lùi 10s (Arrow Left)"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {/* Play/Pause */}
            <button onClick={onTogglePlay} className="text-white transition hover:text-primary p-1" title={isPlaying ? 'Tạm dừng (k)' : 'Phát (k)'}>
              {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white" />}
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => onSeek(Math.min(duration || 0, currentTime + 10))}
              className="text-white hover:text-primary transition p-1"
              title="Tiến 10s (Arrow Right)"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Left controls slot (next episode, etc.) */}
            {leftControls}

            {/* Volume */}
            <div className="relative flex items-center group/volume">
              <button onClick={toggleMute} className="text-white/70 transition hover:text-white p-2 -ml-1 flex items-center justify-center" title={isMuted ? 'Bật âm (m)' : 'Tắt âm (m)'}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              
              {/* Vertical Slider Popup */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex h-0 w-8 items-center justify-center overflow-hidden rounded-full bg-black/80 shadow-xl border border-white/10 backdrop-blur-md opacity-0 transition-all duration-300 group-hover/volume:h-28 group-hover/volume:opacity-100 group-hover/volume:py-3 origin-bottom">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-20 w-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary focus:outline-none focus:ring-0
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  style={{
                    WebkitAppearance: 'slider-vertical',
                  } as React.CSSProperties & { WebkitAppearance?: string }}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-xs font-medium text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right controls slot (subtitles, settings, next episode, etc.) */}
            {rightControls}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 transition hover:text-white p-1" title="Toàn màn hình (f)">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
