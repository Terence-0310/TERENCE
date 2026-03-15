'use client'

// ============================================
// VideoPlayer — HLS/MP4 player with resume playback
// Internal component, used only inside watch page player area
// ============================================

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, Loader2, AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { saveWatchProgress, getWatchProgress, formatTime } from '@/lib/watch-progress'
import type { SubtitleTrack } from '@/types/movie'

interface VideoPlayerProps {
  src: string
  type: 'hls' | 'mp4'
  poster?: string
  movieId: number
  episodeId?: string
  subtitles?: SubtitleTrack[]
}

export function VideoPlayer({ src, type, poster, movieId, episodeId, subtitles }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [resumeTime, setResumeTime] = useState(0)

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── HLS.js init ──
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: any = null

    async function initHls() {
      if (type !== 'hls') {
        video!.src = src
        return
      }

      const Hls = (await import('hls.js')).default

      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1, // auto quality
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        })

        hls.loadSource(src)
        hls.attachMedia(video!)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false)
          checkResume()
        })

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            console.error('[Player] HLS fatal error:', data.type)
            setHasError(true)
            setErrorMsg('Lỗi tải nguồn phát. Vui lòng thử lại.')
            setIsLoading(false)
          }
        })
      } else if (video!.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video!.src = src
      } else {
        setHasError(true)
        setErrorMsg('Trình duyệt không hỗ trợ phát video HLS.')
        setIsLoading(false)
      }
    }

    initHls()

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, type])

  // ── Check resume ──
  function checkResume() {
    const saved = getWatchProgress(movieId, episodeId)
    if (saved && saved.currentTime > 10) {
      setResumeTime(saved.currentTime)
      setShowResumePrompt(true)
    }
  }

  // For MP4 — also check resume once loaded
  function handleLoadedData() {
    setIsLoading(false)
    if (type === 'mp4') {
      checkResume()
    }
  }

  function handleResume(doResume: boolean) {
    setShowResumePrompt(false)
    const video = videoRef.current
    if (!video) return
    if (doResume) {
      video.currentTime = resumeTime
    }
    video.play().catch(() => {})
  }

  // ── Playback events ──
  function handlePlay() { setIsPlaying(true) }
  function handlePause() { setIsPlaying(false) }

  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
  }

  function handleDurationChange() {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
  }

  function handleWaiting() { setIsLoading(true) }
  function handleCanPlay() { setIsLoading(false) }

  function handleError() {
    setHasError(true)
    setErrorMsg('Lỗi phát video. Vui lòng thử lại.')
    setIsLoading(false)
  }

  // ── Save progress periodically ──
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      if (video && !video.paused && video.duration > 0) {
        saveWatchProgress(movieId, video.currentTime, video.duration, episodeId)
      }
    }, 5000)

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      // Save on unmount
      const video = videoRef.current
      if (video && video.duration > 0) {
        saveWatchProgress(movieId, video.currentTime, video.duration, episodeId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, episodeId])

  // ── Controls ──
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    const time = Number(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  function handleRetry() {
    setHasError(false)
    setIsLoading(true)
    const video = videoRef.current
    if (video) {
      video.load()
      video.play().catch(() => {})
    }
  }

  // ── Auto-hide controls ──
  function handleMouseMove() {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  // Listen for fullscreen changes
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const video = videoRef.current
      if (!video) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 10)
          break
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // ── Error state ──
  if (hasError) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">{errorMsg}</p>
            <p className="mt-1 text-xs text-white/40">Kiểm tra kết nối mạng hoặc thử nguồn phát khác.</p>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
            Thử lại
          </button>
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
      {/* Video element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedData={handleLoadedData}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={handleError}
      >
        {subtitles?.map((sub) => (
          <track
            key={sub.lang}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.lang}
            label={sub.label}
            default={sub.default}
          />
        ))}
      </video>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
        </div>
      )}

      {/* Resume prompt */}
      {showResumePrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl bg-card/90 border border-white/10 p-6 text-center shadow-2xl backdrop-blur-md max-w-sm mx-4">
            <p className="text-sm font-semibold text-white">Tiếp tục xem?</p>
            <p className="mt-1.5 text-xs text-white/50">
              Bạn đã xem đến {formatTime(resumeTime)}
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => handleResume(true)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => handleResume(false)}
                className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/20"
              >
                Xem lại từ đầu
              </button>
            </div>
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
        <div className="h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 space-y-2">
          {/* Progress bar */}
          <div className="group/progress relative">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 appearance-none cursor-pointer rounded-full bg-white/20 accent-primary
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30
                group-hover/progress:[&::-webkit-slider-thumb]:w-4 group-hover/progress:[&::-webkit-slider-thumb]:h-4 group-hover/progress:h-1.5 transition-all"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
              }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white transition hover:text-primary" title={isPlaying ? 'Tạm dừng (k)' : 'Phát (k)'}>
              {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            {/* Volume */}
            <button onClick={toggleMute} className="text-white/70 transition hover:text-white" title={isMuted ? 'Bật âm (m)' : 'Tắt âm (m)'}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            {/* Time */}
            <span className="text-xs font-medium text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 transition hover:text-white" title="Toàn màn hình (f)">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
