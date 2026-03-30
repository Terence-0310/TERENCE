'use client'

// ============================================
// WatchPlayer — Watch Party HLS Player
// ============================================
// Production-grade HLS player specifically built for watch party:
// - hls.js with Safari native fallback
// - Host controls playback, viewers receive sync
// - Loading + error + poster UI
// - Auto-play on join
// - Emits play/pause/seek events for sync

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Loader2, AlertTriangle,
  RotateCcw, Crown, Lock,
} from 'lucide-react'

// ── Types ──

export interface WatchPlayerProps {
  /** HLS stream URL (.m3u8) */
  streamUrl: string | null
  /** Poster image URL */
  poster?: string | null
  /** Is this user the host? */
  isHost: boolean
  /** Room title for display */
  title?: string
  /** Auto-play when loaded */
  autoPlay?: boolean
  /** Sync event handlers */
  onPlay?: (currentTime: number) => void
  onPause?: (currentTime: number) => void
  onSeeked?: (currentTime: number) => void
  onTimeUpdate?: (currentTime: number) => void
}

export interface WatchPlayerRef {
  /** Get current time */
  getCurrentTime: () => number
  /** Set current time (for sync) */
  seekTo: (time: number) => void
  /** Play the video */
  play: () => void
  /** Pause the video */
  pause: () => void
  /** Get the video element */
  getVideo: () => HTMLVideoElement | null
}

// ── Helpers ──

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Demo fallback stream
const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export const WatchPlayer = forwardRef<WatchPlayerRef, WatchPlayerProps>(function WatchPlayer(
  {
    streamUrl,
    poster,
    isHost,
    title,
    autoPlay = true,
    onPlay,
    onPause,
    onSeeked,
    onTimeUpdate,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const isRemoteAction = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeUpdateThrottle = useRef(0)

  // ── State ──
  const [playerState, setPlayerState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showPoster, setShowPoster] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [viewerToast, setViewerToast] = useState(false)

  // ── Imperative handle for parent sync ──
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    seekTo: (time: number) => {
      if (videoRef.current) {
        isRemoteAction.current = true
        videoRef.current.currentTime = time
        setTimeout(() => { isRemoteAction.current = false }, 500)
      }
    },
    play: () => {
      if (videoRef.current) {
        isRemoteAction.current = true
        videoRef.current.play().catch(() => {})
        setTimeout(() => { isRemoteAction.current = false }, 500)
      }
    },
    pause: () => {
      if (videoRef.current) {
        isRemoteAction.current = true
        videoRef.current.pause()
        setTimeout(() => { isRemoteAction.current = false }, 500)
      }
    },
    getVideo: () => videoRef.current,
  }), [])

  // ════════════════════════════════════════
  // 1. INIT HLS
  // ════════════════════════════════════════
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const src = streamUrl || DEMO_STREAM
    setPlayerState('loading')
    setErrorMsg('')
    setShowPoster(true)

    // ── hls.js supported ──
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1, // auto quality
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hlsRef.current = hls

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerState('ready')
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked — show play button
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return

        console.error('[WatchPlayer] Fatal HLS error:', data.type, data.details)

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Try to recover
          hls.startLoad()
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else {
          setPlayerState('error')
          setErrorMsg('Không thể phát video. Vui lòng thử lại.')
          hls.destroy()
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    // ── Native HLS (Safari / iOS) ──
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src

      const handleLoaded = () => {
        setPlayerState('ready')
        if (autoPlay) video.play().catch(() => {})
      }

      const handleError = () => {
        setPlayerState('error')
        setErrorMsg('Không thể phát video trên trình duyệt này.')
      }

      video.addEventListener('loadedmetadata', handleLoaded)
      video.addEventListener('error', handleError)

      return () => {
        video.removeEventListener('loadedmetadata', handleLoaded)
        video.removeEventListener('error', handleError)
        video.removeAttribute('src')
        video.load()
      }
    }

    // ── Not supported at all ──
    setPlayerState('error')
    setErrorMsg('Trình duyệt không hỗ trợ phát HLS.')

    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  // ════════════════════════════════════════
  // 2. VIDEO EVENTS
  // ════════════════════════════════════════
  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setShowPoster(false)
    if (!isRemoteAction.current && onPlay) {
      onPlay(videoRef.current?.currentTime ?? 0)
    }
  }, [onPlay])

  const handlePauseEv = useCallback(() => {
    setIsPlaying(false)
    if (!isRemoteAction.current && onPause) {
      onPause(videoRef.current?.currentTime ?? 0)
    }
  }, [onPause])

  const handleSeekedEv = useCallback(() => {
    if (!isRemoteAction.current && onSeeked) {
      onSeeked(videoRef.current?.currentTime ?? 0)
    }
  }, [onSeeked])

  const handleTimeUpdateEv = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    }
    // Throttle external callback to every 5s
    const now = Date.now()
    if (onTimeUpdate && now - timeUpdateThrottle.current > 5000) {
      timeUpdateThrottle.current = now
      onTimeUpdate(video.currentTime)
    }
  }, [onTimeUpdate])

  const handleDuration = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [])

  const handleVideoError = useCallback(() => {
    if (hlsRef.current) return // hls.js handles errors
    setPlayerState('error')
    setErrorMsg('Video bị lỗi.')
  }, [])

  // ════════════════════════════════════════
  // 3. PLAYER CONTROLS — Host only!
  // ════════════════════════════════════════

  // Show toast for viewers who try to control
  const showViewerBlocked = useCallback(() => {
    if (isHost) return false
    setViewerToast(true)
    setTimeout(() => setViewerToast(false), 2000)
    return true // blocked
  }, [isHost])

  const togglePlay = useCallback(() => {
    if (showViewerBlocked()) return
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }, [showViewerBlocked])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const vol = Number(e.target.value)
    video.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    if (!document.fullscreenElement) {
      c.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  const handleSeekBar = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showViewerBlocked()) return
    const video = videoRef.current
    if (!video || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    video.currentTime = (x / rect.width) * duration
  }, [duration, showViewerBlocked])

  const handleRetry = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setPlayerState('loading')
    setErrorMsg('')
    const src = streamUrl || DEMO_STREAM
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerState('ready')
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          setPlayerState('error')
          setErrorMsg('Không thể phát video.')
        }
      })
    } else {
      video.src = src
      video.load()
    }
  }, [streamUrl])

  // ── Auto-hide controls ──
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  // ── Fullscreen change ──
  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  }, [])

  // ── Keyboard ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break // blocked for viewers inside togglePlay
        case 'f': e.preventDefault(); toggleFullscreen(); break // fullscreen allowed for everyone
        case 'm': e.preventDefault(); toggleMute(); break // volume allowed for everyone
        case 'ArrowLeft':
          e.preventDefault()
          if (!isHost) { showViewerBlocked(); break }
          video.currentTime = Math.max(0, video.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (!isHost) { showViewerBlocked(); break }
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute, isHost, showViewerBlocked])

  // ── Derived ──
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  // ── Error state ──
  if (playerState === 'error') {
    return (
      <div ref={containerRef} className="relative h-full w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm font-semibold text-white/90">{errorMsg}</p>
          <p className="text-xs text-white/40">Kiểm tra kết nối mạng hoặc video nguồn.</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black group/player select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* ── Poster overlay ── */}
      {showPoster && poster && !isPlaying && (
        <div
          className="absolute inset-0 z-[5] bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: `url(${poster})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          {title && (
            <div className="absolute bottom-12 left-6">
              <p className="text-lg font-bold text-white drop-shadow-lg">{title}</p>
              <p className="text-xs text-white/60 mt-1">Nhấn play để bắt đầu xem</p>
            </div>
          )}
        </div>
      )}

      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        onClick={togglePlay}
        onPlay={handlePlay}
        onPause={handlePauseEv}
        onSeeked={handleSeekedEv}
        onTimeUpdate={handleTimeUpdateEv}
        onDurationChange={handleDuration}
        onWaiting={() => setPlayerState('loading')}
        onCanPlay={() => { if (playerState === 'loading') setPlayerState('ready') }}
        onError={handleVideoError}
        crossOrigin="anonymous"
      />

      {/* ── Viewer blocked toast ── */}
      {viewerToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-fade-in">
          <div className="flex items-center gap-2 rounded-xl bg-black/85 backdrop-blur-xl border border-white/10 px-5 py-3 shadow-2xl">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-white/90 whitespace-nowrap">Host đang điều khiển player</span>
          </div>
        </div>
      )}

      {/* ── Loading spinner ── */}
      {playerState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
            <p className="text-xs text-white/40 animate-pulse">Đang tải stream...</p>
          </div>
        </div>
      )}

      {/* ── Big play button ── */}
      {!isPlaying && playerState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/90 shadow-2xl shadow-primary/30 animate-pulse">
            <Play className="h-7 w-7 fill-white text-white ml-1" />
          </div>
        </div>
      )}

      {/* ── Host / Viewer badge ── */}
      <div className={`absolute top-3 left-3 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {isHost ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-[11px] font-semibold text-amber-400 backdrop-blur-sm shadow-lg shadow-amber-500/5">
            <Crown className="w-3.5 h-3.5" />
            <span>Host — bạn điều khiển player</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 text-[11px] font-semibold text-blue-400 backdrop-blur-sm shadow-lg shadow-blue-500/5">
            <Lock className="w-3.5 h-3.5" />
            <span>Host đang điều khiển — bạn chỉ xem</span>
          </div>
        )}
      </div>

      {/* ── Controls overlay ── */}
      <div className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
        showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 space-y-2">
          {/* Progress bar */}
          <div
            className={`group/progress relative h-1.5 rounded-full bg-white/15 transition-all ${isHost ? 'cursor-pointer hover:h-2.5' : 'cursor-not-allowed'}`}
            onClick={handleSeekBar}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${bufferedPct}%` }} />
            <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${isHost ? 'bg-primary' : 'bg-blue-500/60'}`} style={{ width: `${progress}%` }} />
            {isHost && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow-lg shadow-primary/30 opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
            )}
          </div>

          {/* Button row */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={togglePlay}
              className={`p-1 transition ${isHost ? 'text-white hover:text-primary' : 'text-white/30 cursor-not-allowed'}`}
              title={isHost ? (isPlaying ? 'Tạm dừng (k)' : 'Phát (k)') : 'Host đang điều khiển'}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume">
              <button onClick={toggleMute} className="text-white/70 transition hover:text-white p-1">
                {isMuted || volume === 0
                  ? <VolumeX className="h-5 w-5" />
                  : volume < 0.5
                    ? <Volume1 className="h-5 w-5" />
                    : <Volume2 className="h-5 w-5" />
                }
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 appearance-none cursor-pointer rounded-full bg-white/20 accent-primary
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            <span className="text-xs font-medium text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* No stream indicator */}
            {!streamUrl && (
              <span className="text-[9px] text-white/25 bg-white/5 rounded px-1.5 py-0.5 border border-white/[.06]">
                Demo stream
              </span>
            )}

            <button onClick={toggleFullscreen} className="text-white/70 transition hover:text-white p-1" title="Toàn màn hình (f)">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
