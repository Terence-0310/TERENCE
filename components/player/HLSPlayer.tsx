'use client'

// ============================================
// HLSPlayer — Production-grade HLS video player
// ============================================
// Uses useHLS + usePlayer hooks for robust playback with
// multi-server fallback, retry logic, and resume playback.

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Loader2, AlertTriangle,
  RotateCcw, SkipForward, Settings, Subtitles,
  Gauge, ChevronRight, Server, MonitorPlay,
} from 'lucide-react'
import { useHLS } from '@/hooks/useHLS'
import { usePlayer } from '@/hooks/usePlayer'
import type { PlayerServer, PlayerMovieMeta } from '@/hooks/usePlayer'
import { formatTime } from '@/lib/player/time-format'

// ── Props ──

interface HLSPlayerProps {
  servers: PlayerServer[]
  movieId: string
  episodeSlug?: string
  poster?: string
  subtitles?: SubtitleTrack[]
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
  onEnded?: () => void
  /** Movie metadata for watch history tracking */
  movieMeta?: PlayerMovieMeta
}

interface SubtitleTrack {
  id: string
  label: string
  lang: string
  url: string
  isDefault: boolean
  kind: string
}

// ── Constants ──

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const PROGRESS_SAVE_INTERVAL = 10_000

export function HLSPlayer({
  servers,
  movieId,
  episodeSlug,
  poster,
  subtitles = [],
  hasNextEpisode = false,
  onNextEpisode,
  onEnded,
  movieMeta,
}: HLSPlayerProps) {
  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Player State ──
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'speed' | 'subtitle' | 'server'>('main')
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [resumeTime, setResumeTime] = useState(0)
  const [showServerBar, setShowServerBar] = useState(false)

  // ── usePlayer hook ──
  const player = usePlayer({
    servers,
    movieId,
    episodeSlug,
    movieMeta,
    maxRetries: 3,
    onAllServersFailed: () => {
      console.error('[HLSPlayer] All servers failed')
    },
  })

  // ── useHLS hook ──
  const hls = useHLS({
    onReady: () => {
      console.log('[HLSPlayer] HLS ready')
      player.markReady()

      const savedTime = player.getSavedProgress()
      if (savedTime && savedTime > 10) {
        setResumeTime(savedTime)
        setShowResumePrompt(true)
      }
    },
    onError: (errorType, details, fatal) => {
      if (!fatal) return

      console.error(`[HLSPlayer] Fatal HLS error: ${errorType} — ${details}`)

      // Try internal HLS recovery first (returns false if exhausted)
      if (errorType.includes('network') || errorType.includes('NETWORK') || errorType === 'networkError') {
        const recovered = hls.recoverNetworkError()
        if (recovered) return // Wait for result
      } else if (errorType.includes('media') || errorType.includes('MEDIA') || errorType === 'mediaError') {
        const recovered = hls.recoverMediaError()
        if (recovered) return // Wait for result
      }

      // Recovery exhausted or unknown error — escalate to player retry/fallback
      player.reportError(errorType, details)
    },
  })

  // ── Load source when URL or reloadKey changes ──
  useEffect(() => {
    const video = videoRef.current
    if (!video || !player.currentUrl) return

    console.log(`[HLSPlayer] Loading: ${player.currentUrl} (Server: ${player.currentServerName}, key: ${player.reloadKey})`)

    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setIsPlaying(false)
    setShowResumePrompt(false)

    hls.loadSource(video, player.currentUrl)

    return () => {
      hls.destroy()
    }
    // reloadKey changes on retry, server switch, etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentUrl, player.reloadKey])

  // ── Default subtitle ──
  useEffect(() => {
    const defaultSub = subtitles.find((s) => s.isDefault)
    if (defaultSub) setActiveSubtitle(defaultSub.lang)
  }, [subtitles])

  // ── Save progress periodically ──
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      if (video && !video.paused && video.duration > 0) {
        player.saveProgress(video.currentTime, video.duration)
      }
    }, PROGRESS_SAVE_INTERVAL)

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      const video = videoRef.current
      if (video && video.duration > 0) {
        player.saveProgress(video.currentTime, video.duration)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, episodeSlug])

  // ── Save on page unload ──
  useEffect(() => {
    const handleUnload = () => {
      const video = videoRef.current
      if (video && video.duration > 0) {
        player.saveProgress(video.currentTime, video.duration)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [player])

  // ── Video event handlers ──
  function handlePlay() { setIsPlaying(true) }

  function handlePauseEvent() {
    setIsPlaying(false)
    const video = videoRef.current
    if (video && video.duration > 0) {
      player.saveProgress(video.currentTime, video.duration)
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    }
  }

  function handleDurationChange() {
    const video = videoRef.current
    if (video) setDuration(video.duration)
  }

  function handleWaiting() { player.setLoading(true) }
  function handleCanPlay() { player.setLoading(false) }

  function handleLoadedData() {
    player.setLoading(false)
    if (videoRef.current && hls.isNativeHLS(videoRef.current)) {
      const savedTime = player.getSavedProgress()
      if (savedTime && savedTime > 10) {
        setResumeTime(savedTime)
        setShowResumePrompt(true)
      }
    }
  }

  function handleVideoError() {
    console.error('[HLSPlayer] Video element error')
    player.reportError('VIDEO_ERROR', 'Video element error')
  }

  function handleEnded() {
    const video = videoRef.current
    if (video && video.duration > 0) {
      player.saveProgress(video.duration, video.duration)
    }
    onEnded?.()
  }

  // ── Resume ──
  function handleResume(doResume: boolean) {
    setShowResumePrompt(false)
    const video = videoRef.current
    if (!video) return
    if (doResume) video.currentTime = resumeTime
    video.play().catch(() => {})
  }

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

  function handleProgressBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current
    if (!video || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    video.currentTime = (x / rect.width) * duration
    setCurrentTime(video.currentTime)
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
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = (lang && tracks[i].language === lang) ? 'showing' : 'hidden'
    }
    setSettingsPanel('main')
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

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const video = videoRef.current
      if (!video) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
        case 'm': e.preventDefault(); toggleMute(); break
        case 'ArrowLeft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break
        case 'ArrowRight': e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); setVolume(video.volume); break
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); setVolume(video.volume); break
        case 'Escape': setShowSettings(false); break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute])

  // ── Derived ──
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0
  const hasMultipleServers = servers.length > 1

  // ═══════════════════════════ RENDER ═══════════════════════════

  // Error state — all servers failed
  if (player.allServersFailed) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">{player.errorMessage}</p>
            <p className="mt-1 text-xs text-white/40">Kiểm tra kết nối mạng hoặc thử lại sau.</p>
          </div>
          <button
            onClick={player.retry}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
            Thử lại tất cả
          </button>
          {hasMultipleServers && (
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
              {servers.map((server, idx) => (
                <button
                  key={idx}
                  onClick={() => player.setServer(idx)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 border border-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Server className="h-3 w-3" />
                  {server.name}
                </button>
              ))}
            </div>
          )}
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
      {/* Video */}
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
        onError={handleVideoError}
        onEnded={handleEnded}
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

      {/* Loading */}
      {player.isLoading && !player.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
            <p className="text-xs text-white/40 animate-pulse">Đang tải...</p>
            {player.retryCount > 0 && (
              <p className="text-[10px] text-white/30">
                Đang thử lại ({player.retryCount}/3)...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Inline error */}
      {player.hasError && !player.allServersFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-white/80">{player.errorMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={player.retry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Thử lại
              </button>
              {hasMultipleServers && (
                <button
                  onClick={player.nextServer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Đổi server
                </button>
              )}
            </div>
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

      {/* Big play button */}
      {!isPlaying && !player.isLoading && !showResumePrompt && !player.hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/90 shadow-2xl shadow-primary/30 animate-scale-in">
            <Play className="h-7 w-7 fill-white text-white ml-1" />
          </div>
        </div>
      )}

      {/* Server indicator */}
      {hasMultipleServers && (
        <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => setShowServerBar(!showServerBar)}
            className="inline-flex items-center gap-1.5 rounded-lg glass px-3 py-1.5 text-[11px] font-medium text-white/70 border border-white/10 transition hover:bg-white/15 hover:text-white"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            {player.currentServerName}
          </button>
          {showServerBar && (
            <div className="absolute top-full right-0 mt-1 w-48 rounded-xl bg-black/95 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden animate-scale-in z-50">
              <div className="py-1">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 border-b border-white/5">
                  Chọn server
                </div>
                {servers.map((server, idx) => (
                  <button
                    key={idx}
                    onClick={() => { player.setServer(idx); setShowServerBar(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-white/10 ${
                      idx === player.currentServerIndex ? 'text-primary font-semibold' : 'text-white/70'
                    }`}
                  >
                    <Server className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{server.name}</span>
                    {idx === player.currentServerIndex && <span className="ml-auto text-primary text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 space-y-2">
          {/* Progress bar */}
          <div
            className="group/progress relative h-1.5 cursor-pointer rounded-full bg-white/15 transition-all hover:h-2.5"
            onClick={handleProgressBarClick}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow-lg shadow-primary/30 opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={togglePlay} className="text-white transition hover:text-primary p-1" title={isPlaying ? 'Tạm dừng (k)' : 'Phát (k)'}>
              {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            {hasNextEpisode && onNextEpisode && (
              <button onClick={onNextEpisode} className="text-white/70 transition hover:text-white p-1" title="Tập tiếp theo">
                <SkipForward className="h-5 w-5" />
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume">
              <button onClick={toggleMute} className="text-white/70 transition hover:text-white p-1">
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : volume < 0.5 ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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

            {subtitles.length > 0 && (
              <button
                onClick={() => { setShowSettings(true); setSettingsPanel('subtitle') }}
                className={`p-1 transition ${activeSubtitle ? 'text-primary' : 'text-white/70 hover:text-white'}`}
              >
                <Subtitles className="h-5 w-5" />
              </button>
            )}

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setSettingsPanel('main') }}
                className="text-white/70 transition hover:text-white p-1"
              >
                <Settings className={`h-5 w-5 transition-transform ${showSettings ? 'rotate-45' : ''}`} />
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 w-56 rounded-xl bg-black/95 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden animate-scale-in z-50">
                  {settingsPanel === 'main' && (
                    <div className="py-1">
                      <button onClick={() => setSettingsPanel('speed')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition">
                        <span className="flex items-center gap-2"><Gauge className="h-4 w-4" />Tốc độ phát</span>
                        <span className="text-xs text-white/50">{playbackRate}x</span>
                      </button>
                      {hasMultipleServers && (
                        <button onClick={() => setSettingsPanel('server')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition">
                          <span className="flex items-center gap-2"><Server className="h-4 w-4" />Server</span>
                          <span className="text-xs text-white/50">{player.currentServerName}</span>
                        </button>
                      )}
                      {subtitles.length > 0 && (
                        <button onClick={() => setSettingsPanel('subtitle')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition">
                          <span className="flex items-center gap-2"><Subtitles className="h-4 w-4" />Phụ đề</span>
                          <span className="text-xs text-white/50">{activeSubtitle ? subtitles.find((s) => s.lang === activeSubtitle)?.label || 'On' : 'Tắt'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {settingsPanel === 'speed' && (
                    <div className="py-1">
                      <button onClick={() => setSettingsPanel('main')} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5">
                        ← Tốc độ phát
                      </button>
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRateChange(rate)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${playbackRate === rate ? 'text-primary font-semibold' : 'text-white/70'}`}
                        >
                          <span>{rate === 1 ? 'Bình thường' : `${rate}x`}</span>
                          {playbackRate === rate && <span className="text-primary">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsPanel === 'server' && (
                    <div className="py-1">
                      <button onClick={() => setSettingsPanel('main')} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5">
                        ← Server
                      </button>
                      {servers.map((server, idx) => (
                        <button
                          key={idx}
                          onClick={() => { player.setServer(idx); setSettingsPanel('main'); setShowSettings(false) }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${idx === player.currentServerIndex ? 'text-primary font-semibold' : 'text-white/70'}`}
                        >
                          <span className="flex items-center gap-2"><Server className="h-3.5 w-3.5" />{server.name}</span>
                          {idx === player.currentServerIndex && <span className="text-primary">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsPanel === 'subtitle' && (
                    <div className="py-1">
                      <button onClick={() => setSettingsPanel('main')} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5">
                        ← Phụ đề
                      </button>
                      <button
                        onClick={() => handleSubtitleChange(null)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${!activeSubtitle ? 'text-primary font-semibold' : 'text-white/70'}`}
                      >
                        <span>Tắt phụ đề</span>
                        {!activeSubtitle && <span className="text-primary">✓</span>}
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSubtitleChange(sub.lang)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${activeSubtitle === sub.lang ? 'text-primary font-semibold' : 'text-white/70'}`}
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

            <button onClick={toggleFullscreen} className="text-white/70 transition hover:text-white p-1" title="Toàn màn hình (f)">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
