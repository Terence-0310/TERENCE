'use client'

// ============================================
// WatchPlayer — Watch Party HLS Player
// ============================================
// Production-grade HLS player specifically built for watch party:
// - hls.js with Safari native fallback
// - Host controls playback, viewers receive sync
// - Auto-play on join
// - Emits play/pause/seek events for sync
// - Migrated to BasePlayer for shared UI controls

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import { Crown, Lock } from 'lucide-react'
import { BasePlayer } from '@/src/fe/components/player/BasePlayer'

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
  const hlsRef = useRef<Hls | null>(null)
  const isRemoteAction = useRef(false)
  const timeUpdateThrottle = useRef(0)

  // ── State ──
  const [playerState, setPlayerState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
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

      let retryCount = 0
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return

        console.error('[WatchPlayer] Fatal HLS error:', data.type, data.details)

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount < 5) {
          retryCount++
          console.log(`[WatchPlayer] Retrying network connection (${retryCount}/5)...`)
          hls.startLoad()
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retryCount < 5) {
          retryCount++
          console.log(`[WatchPlayer] Recovering media error (${retryCount}/5)...`)
          hls.recoverMediaError()
        } else {
          setPlayerState('error')
          // Distinct error messages based on failure point
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
             setErrorMsg('Lỗi mạng hoặc CORS từ máy chủ phim. Thử đổi server hoặc tải lại.')
          } else {
             setErrorMsg('Không thể phát video (Lỗi định dạng). Vui lòng thử đổi server.')
          }
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
  // 3. PLAYER CONTROLS — Host Check
  // ════════════════════════════════════════

  const showViewerBlocked = useCallback(() => {
    if (isHost) return false
    setViewerToast(true)
    setTimeout(() => setViewerToast(false), 2000)
    return true // blocked
  }, [isHost])

  const handleUserTogglePlay = useCallback(() => {
    if (showViewerBlocked()) return
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }, [showViewerBlocked])

  const handleUserSeek = useCallback((time: number) => {
    if (showViewerBlocked()) return
    const video = videoRef.current
    if (!video || duration <= 0) return
    video.currentTime = time
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

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  const rightControls = !streamUrl ? (
    <span className="text-[9px] text-white/25 bg-white/5 rounded px-1.5 py-0.5 border border-white/[.06]">
      Demo stream
    </span>
  ) : undefined

  return (
    <BasePlayer
      videoRef={videoRef}
      isPlaying={isPlaying}
      isLoading={playerState === 'loading'}
      currentTime={currentTime}
      duration={duration}
      buffered={buffered}
      hasError={playerState === 'error'}
      errorMessage={errorMsg}
      onRetry={handleRetry}
      onTogglePlay={handleUserTogglePlay}
      onSeek={handleUserSeek}
      rightControls={rightControls}
      topOverlay={
        <div className="absolute top-3 left-3 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
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
      }
    >
      {/* ── Poster overlay ── */}
      {showPoster && poster && !isPlaying && (
        <div
          className="absolute inset-0 z-[5] bg-cover bg-center transition-opacity duration-500 pointer-events-none"
          style={{ backgroundImage: `url(${poster})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          {title && (
            <div className="absolute bottom-12 left-6">
              <p className="text-lg font-bold text-white drop-shadow-lg">{title}</p>
              <p className="text-xs text-white/60 mt-1">Nhấn nút Play để bắt đầu xem cùng nhau</p>
            </div>
          )}
        </div>
      )}

      {/* ── Viewer blocked toast ── */}
      {viewerToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-fade-in pointer-events-none">
          <div className="flex items-center gap-2 rounded-xl bg-black/85 backdrop-blur-xl border border-white/10 px-5 py-3 shadow-2xl">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-white/90 whitespace-nowrap">Host đang điều khiển player</span>
          </div>
        </div>
      )}

      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain pointer-events-auto cursor-pointer"
        onClick={handleUserTogglePlay}
        playsInline
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
    </BasePlayer>
  )
})
