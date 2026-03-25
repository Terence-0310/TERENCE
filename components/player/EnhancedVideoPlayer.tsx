'use client'

// ============================================
// Enhanced VideoPlayer — HLS/MP4 with subtitles, quality switch, resume
// ============================================

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Loader2, AlertTriangle,
  RotateCcw, SkipForward, Settings, Subtitles,
  Gauge, ChevronRight,
} from 'lucide-react'
import type { PlayableSource, PlayableSubtitle } from '@/lib/player/types'
import { formatTime } from '@/lib/player/time-format'

interface VideoPlayerProps {
  src: string
  type: 'hls' | 'mp4'
  poster?: string
  movieId: string
  episodeId?: string | null
  subtitles?: PlayableSubtitle[]
  sources?: PlayableSource[]
  onSourceChange?: (source: PlayableSource) => void
  onNextEpisode?: () => void
  hasNextEpisode?: boolean
  onProgress?: (currentTime: number, duration: number) => void
  initialTime?: number
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export function EnhancedVideoPlayer({
  src,
  type,
  poster,
  movieId,
  episodeId,
  subtitles = [],
  sources = [],
  onSourceChange,
  onNextEpisode,
  hasNextEpisode = false,
  onProgress,
  initialTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'quality' | 'speed' | 'subtitle'>('main')
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const [buffered, setBuffered] = useState(0)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [resumeTime, setResumeTime] = useState(0)
  const [hasAppliedInitialTime, setHasAppliedInitialTime] = useState(false)

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hlsRef = useRef<any>(null)

  // Initialize default subtitle
  useEffect(() => {
    const defaultSub = subtitles.find((s) => s.isDefault)
    if (defaultSub) setActiveSubtitle(defaultSub.lang)
  }, [subtitles])

  // ── HLS.js / MP4 init ──
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: any = null
    setHasError(false)
    setIsLoading(true)

    async function init() {
      if (type !== 'hls') {
        video!.src = src
        return
      }

      // Check native HLS first (Safari)
      if (video!.canPlayType('application/vnd.apple.mpegurl')) {
        video!.src = src
        return
      }

      const Hls = (await import('hls.js')).default

      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
        })

        hls.loadSource(src)
        hls.attachMedia(video!)
        hlsRef.current = hls

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false)
          handleResumeCheck()
        })

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            console.error('[Player] HLS fatal error:', data.type, data.details)

            // Try recovery
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                setHasError(true)
                setErrorMsg('Lỗi tải nguồn phát. Vui lòng thử lại.')
                setIsLoading(false)
                break
            }
          }
        })
      } else {
        setHasError(true)
        setErrorMsg('Trình duyệt không hỗ trợ phát video HLS.')
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (hls) {
        hls.destroy()
        hlsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, type])

  // ── Resume check ──
  function handleResumeCheck() {
    if (initialTime && initialTime > 10 && !hasAppliedInitialTime) {
      setResumeTime(initialTime)
      setShowResumePrompt(true)
    }
  }

  function handleLoadedData() {
    setIsLoading(false)
    if (type === 'mp4') {
      handleResumeCheck()
    }
  }

  function handleResume(doResume: boolean) {
    setShowResumePrompt(false)
    setHasAppliedInitialTime(true)
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

    // Update buffered
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    }
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
        onProgress?.(video.currentTime, video.duration)
      }
    }, 10000) // every 10 seconds

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      // Save on unmount
      const video = videoRef.current
      if (video && video.duration > 0) {
        onProgress?.(video.currentTime, video.duration)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, episodeId])

  // Save on pause
  function handlePauseEvent() {
    setIsPlaying(false)
    const video = videoRef.current
    if (video && video.duration > 0) {
      onProgress?.(video.currentTime, video.duration)
    }
  }

  // Save before unload
  useEffect(() => {
    function handleBeforeUnload() {
      const video = videoRef.current
      if (video && video.duration > 0) {
        onProgress?.(video.currentTime, video.duration)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [onProgress])

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

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const vol = Number(e.target.value)
    video.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
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

  function handleProgressBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current
    if (!video || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    const time = percent * duration
    video.currentTime = time
    setCurrentTime(time)
  }

  function handlePlaybackRateChange(rate: number) {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
    setSettingsPanel('main')
  }

  function handleSubtitleChange(lang: string | null) {
    const video = videoRef.current
    if (!video) return

    setActiveSubtitle(lang)

    // Toggle text tracks
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      if (lang && track.language === lang) {
        track.mode = 'showing'
      } else {
        track.mode = 'hidden'
      }
    }
    setSettingsPanel('main')
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

  function handleTryAlternateSource() {
    if (sources.length <= 1) return
    // Find current source and switch to next
    const currentIdx = sources.findIndex((s) => s.url === src)
    const nextIdx = (currentIdx + 1) % sources.length
    const nextSource = sources[nextIdx]
    if (nextSource && onSourceChange) {
      setHasError(false)
      setIsLoading(true)
      onSourceChange(nextSource)
    }
  }

  // ── Auto-hide controls ──
  function handleMouseMove() {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
        setShowSettings(false)
      }
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
          setVolume(video.volume)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          setVolume(video.volume)
          break
        case 'Escape':
          setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0

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
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </button>
            {sources.length > 1 && (
              <button
                onClick={handleTryAlternateSource}
                className="inline-flex items-center gap-2 rounded-lg bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/30"
              >
                <ChevronRight className="h-4 w-4" />
                Thử nguồn khác
              </button>
            )}
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
      {/* Video element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={handlePlay}
        onPause={handlePauseEvent}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedData={handleLoadedData}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={handleError}
        crossOrigin="anonymous"
      >
        {subtitles.map((sub) => (
          <track
            key={sub.id}
            kind={sub.kind as any}
            src={sub.url}
            srcLang={sub.lang}
            label={sub.label}
            default={sub.isDefault}
          />
        ))}
      </video>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
            <p className="text-xs text-white/40 animate-pulse">Đang tải...</p>
          </div>
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

      {/* Click to play center button when paused */}
      {!isPlaying && !isLoading && !showResumePrompt && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/90 shadow-2xl shadow-primary/30 transition-transform hover:scale-110 animate-scale-in">
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

          {/* Buttons row */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white transition hover:text-primary p-1" title={isPlaying ? 'Tạm dừng (k)' : 'Phát (k)'}>
              {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            {/* Next episode */}
            {hasNextEpisode && onNextEpisode && (
              <button onClick={onNextEpisode} className="text-white/70 transition hover:text-white p-1" title="Tập tiếp theo">
                <SkipForward className="h-5 w-5" />
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume">
              <button onClick={toggleMute} className="text-white/70 transition hover:text-white p-1" title={isMuted ? 'Bật âm' : 'Tắt âm'}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 appearance-none cursor-pointer rounded-full bg-white/20 accent-primary
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Time */}
            <span className="text-xs font-medium text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Subtitle button */}
            {subtitles.length > 0 && (
              <button
                onClick={() => { setShowSettings(true); setSettingsPanel('subtitle') }}
                className={`p-1 transition ${activeSubtitle ? 'text-primary' : 'text-white/70 hover:text-white'}`}
                title="Phụ đề"
              >
                <Subtitles className="h-5 w-5" />
              </button>
            )}

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings)
                  setSettingsPanel('main')
                }}
                className="text-white/70 transition hover:text-white p-1"
                title="Cài đặt"
              >
                <Settings className={`h-5 w-5 transition-transform ${showSettings ? 'rotate-45' : ''}`} />
              </button>

              {/* Settings menu */}
              {showSettings && (
                <div className="absolute bottom-10 right-0 w-56 rounded-xl bg-black/95 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden animate-scale-in z-50">
                  {settingsPanel === 'main' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('speed')}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Gauge className="h-4 w-4" />
                          Tốc độ phát
                        </span>
                        <span className="text-xs text-white/50">{playbackRate}x</span>
                      </button>
                      {sources.length > 1 && (
                        <button
                          onClick={() => setSettingsPanel('quality')}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Chất lượng
                          </span>
                          <span className="text-xs text-white/50">
                            {sources.find((s) => s.url === src)?.label || 'Auto'}
                          </span>
                        </button>
                      )}
                      {subtitles.length > 0 && (
                        <button
                          onClick={() => setSettingsPanel('subtitle')}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Subtitles className="h-4 w-4" />
                            Phụ đề
                          </span>
                          <span className="text-xs text-white/50">
                            {activeSubtitle ? subtitles.find((s) => s.lang === activeSubtitle)?.label || 'On' : 'Tắt'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {settingsPanel === 'speed' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5"
                      >
                        ← Tốc độ phát
                      </button>
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRateChange(rate)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                            playbackRate === rate ? 'text-primary font-semibold' : 'text-white/70'
                          }`}
                        >
                          <span>{rate === 1 ? 'Bình thường' : `${rate}x`}</span>
                          {playbackRate === rate && <span className="text-primary">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsPanel === 'quality' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5"
                      >
                        ← Chất lượng
                      </button>
                      {sources.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => {
                            if (onSourceChange) onSourceChange(source)
                            setSettingsPanel('main')
                            setShowSettings(false)
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                            source.url === src ? 'text-primary font-semibold' : 'text-white/70'
                          }`}
                        >
                          <span>{source.label}</span>
                          {source.isPrimary && <span className="text-[10px] text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded">Chính</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsPanel === 'subtitle' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5"
                      >
                        ← Phụ đề
                      </button>
                      <button
                        onClick={() => handleSubtitleChange(null)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                          !activeSubtitle ? 'text-primary font-semibold' : 'text-white/70'
                        }`}
                      >
                        <span>Tắt phụ đề</span>
                        {!activeSubtitle && <span className="text-primary">✓</span>}
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSubtitleChange(sub.lang)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                            activeSubtitle === sub.lang ? 'text-primary font-semibold' : 'text-white/70'
                          }`}
                        >
                          <span>{sub.label}</span>
                          {activeSubtitle === sub.lang && <span className="text-primary">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
