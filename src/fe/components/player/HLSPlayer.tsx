'use client'

// ============================================
// HLSPlayer — Production-grade HLS video player
// ============================================
// Sprint 6B: Refactored to use BasePlayer for shared controls UI.
// Uses useHLS + usePlayer hooks for robust playback with
// multi-server fallback, retry logic, and resume playback.
//
// BasePlayer handles: container, controls bar, progress bar,
// play/pause, volume, fullscreen, loading, keyboard shortcuts.
//
// This component manages: HLS init, server switching, resume prompt,
// settings menu, subtitle handling, auto-next episode, error escalation.

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  SkipForward, Settings, Subtitles,
  Gauge, Server, MonitorPlay,
  AlertTriangle, RotateCcw, ChevronRight, Loader2, Info, X, Lock
} from 'lucide-react'
import { useHLS } from '@/src/fe/features/player/hooks/useHLS'
import { useSeekThumbnails } from '@/src/fe/features/player/hooks/useSeekThumbnails'
import { usePlayer } from '@/src/fe/features/player/hooks/usePlayer'
import type { PlayerServer, PlayerMovieMeta } from '@/src/fe/features/player/hooks/usePlayer'
import { formatTime } from '@/lib/player/time-format'
import { BasePlayer } from '@/src/fe/components/player/BasePlayer'
import { useWatchPartyContext } from '@/src/fe/components/watch-party/WatchPartyContext'
import { CreateWatchPartyButton } from '@/src/fe/components/watch-party/CreateWatchPartyButton'
import { logger } from '@/src/fe/lib/logger'

const log = logger.child({ module: 'HLSPlayer' })

// ── Props ──

interface HLSPlayerProps {
  servers: PlayerServer[]
  movieId: string
  episodeSlug?: string
  poster?: string
  videoRef?: React.RefObject<HTMLVideoElement | null>
  subtitles?: SubtitleTrack[]
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
  onEnded?: () => void
  /** Movie metadata for watch history tracking */
  movieMeta?: PlayerMovieMeta
  /** TCoin "hd-upgrade" perk — unlocks quality levels above 720p. */
  canUseHD?: boolean
}

/** Highest video height (px) a user without the HD-upgrade perk may watch. */
const SD_MAX_HEIGHT = 720

interface QualityLevel {
  /** Index in the HLS level list. */
  index: number
  height: number
  bitrate: number
}

/** Human label for a level height, flagging the Full-HD tier. */
function qualityLabel(height: number): string {
  if (height >= 2160) return '2160p (4K)'
  if (height >= 1440) return '1440p (2K)'
  if (height >= 1080) return '1080p Full HD'
  if (height >= 720) return '720p HD'
  if (height > 0) return `${height}p`
  return 'Tự động'
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
  canUseHD = false,
  videoRef: providedVideoRef,
}: HLSPlayerProps) {
  // Seek-bar hover preview thumbnails (lazily generated server-side).
  const thumbnailAt = useSeekThumbnails(movieId, episodeSlug)

  // ── Refs ──
  const internalRef = useRef<HTMLVideoElement>(null)
  const videoRef = providedVideoRef || internalRef
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const party = useWatchPartyContext()

  // ── Player State (local to HLSPlayer, not in BasePlayer) ──
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'speed' | 'subtitle' | 'server' | 'quality'>('main')
  // HLS quality levels (sorted high→low) and the selected level (-1 = auto).
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [selectedLevel, setSelectedLevel] = useState(-1)
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [resumeTime, setResumeTime] = useState(0)
  const [showServerBar, setShowServerBar] = useState(false)
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null)
  // Tracks why we fell back to trailer: 'codec' = source codec/buffer unsupported
  // by the browser (e.g. 10-bit H.264); 'other' = network or unknown.
  const [fallbackReason, setFallbackReason] = useState<'codec' | 'other' | null>(null)
  const [showFallbackBanner, setShowFallbackBanner] = useState(true)

  // ── usePlayer hook ──
  const player = usePlayer({
    servers,
    movieId,
    episodeSlug,
    movieMeta,
    maxRetries: 3,
    onAllServersFailed: () => {
      log.warn({}, 'All servers failed — falling back to trailer / placeholder UI')
    },
  })

  // HLS.js error details that indicate the browser cannot decode the stream
  // (e.g. 10-bit H.264 / unsupported codec). When these fire BEFORE the
  // stream ever becomes playable we fast-fail to the trailer/placeholder UI
  // (no point retrying — codec won't change). When they fire AFTER playback
  // started they're usually transient (seek / quality switch) and the normal
  // recoverMediaError loop handles them.
  const UNRECOVERABLE_DETAILS = new Set([
    'bufferAppendError',
    'bufferAppendingError',
    'bufferIncompatibleCodecsError',
    'bufferAddCodecError',
    'manifestIncompatibleCodecsError',
  ])
  const hasEverPlayedRef = useRef(false)

  // ── useHLS hook ──
  const hls = useHLS({
    onReady: () => {
      log.info({}, 'HLS ready')
      // NOTE: do NOT set hasEverPlayedRef here — onReady fires on
      // MANIFEST_PARSED, BEFORE any segment is appended. Codec failures
      // happen on the first appendBuffer call. We flip the flag in
      // handleCanPlay (fires only after at least one frame decoded).
      player.markReady()

      const savedTime = player.getSavedProgress()
      if (savedTime && savedTime > 10) {
        setResumeTime(savedTime)
        setShowResumePrompt(true)
      }
    },
    onLevelsLoaded: (levels) => {
      // levels arrive in HLS index order; keep the index, sort display high→low.
      const mapped: QualityLevel[] = levels
        .map((l, index) => ({ index, height: l.height, bitrate: l.bitrate }))
        .filter((l) => l.height > 0)
        .sort((a, b) => b.height - a.height)
      setQualityLevels(mapped)
      setSelectedLevel(-1) // reset to auto on new manifest
    },
    onError: (errorType, details, fatal) => {
      if (!fatal) return

      // Only fast-fail on codec errors that occur BEFORE any successful
      // playback — those mean the codec itself is unsupported. Transient
      // buffer errors mid-playback should still go through normal recovery.
      if (UNRECOVERABLE_DETAILS.has(details) && !hasEverPlayedRef.current) {
        log.warn({ errorType, details }, 'Unrecoverable codec/buffer error before playback — switching to fallback UI')
        setFallbackReason('codec')
        setShowFallbackBanner(true)
        player.nextServer()
        return
      }

      log.error({ errorType, details }, 'Fatal HLS error')

      if (errorType.includes('network') || errorType.includes('NETWORK') || errorType === 'networkError') {
        const recovered = hls.recoverNetworkError()
        if (recovered) return
      } else if (errorType.includes('media') || errorType.includes('MEDIA') || errorType === 'mediaError') {
        const recovered = hls.recoverMediaError()
        if (recovered) return
      }

      player.reportError(errorType, details)
    },
  })

  // Reset the "has played" flag whenever we load a new source / server / episode
  useEffect(() => {
    hasEverPlayedRef.current = false
  }, [player.currentUrl, player.reloadKey])

  // ── Loading Timeout Guard ──
  // If player stays in isLoading=true for > 10s, force error to prevent endless spinner on CORS/Mixed-content blocks
  useEffect(() => {
    if (!player.isLoading || player.hasError) return
    const timeout = setTimeout(() => {
      log.warn({}, 'Loading timeout (10s) exceeded. Forcing error fallback.')
      player.reportError('TIMEOUT', 'Video load timeout (CORS or network drop)')
    }, 10000)
    return () => clearTimeout(timeout)
  }, [player.isLoading, player.hasError, player])

  // ── Load source when URL or reloadKey changes ──
  useEffect(() => {
    const video = videoRef.current
    if (!video || !player.currentUrl) return

    log.info({ url: player.currentUrl, server: player.currentServerName, key: player.reloadKey }, 'Loading')

    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setIsPlaying(false)
    setShowResumePrompt(false)

    hls.loadSource(video, player.currentUrl)

    return () => {
      hls.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentUrl, player.reloadKey])

  // ── Default subtitle ──
  useEffect(() => {
    const defaultSub = subtitles.find((s) => s.isDefault)
    if (defaultSub) setActiveSubtitle(defaultSub.lang)
  }, [subtitles])

  // ── HD gate ──
  // Without the hd-upgrade perk, cap auto quality to ≤720p so the player never
  // climbs to a Full-HD rendition. Perk holders run uncapped (autoLevelCapping = -1).
  useEffect(() => {
    const hlsInstance = hls.getHls()
    if (!hlsInstance || qualityLevels.length === 0) return
    if (canUseHD) {
      hlsInstance.autoLevelCapping = -1
      return
    }
    // Highest HLS index whose height is still within the SD limit.
    const allowed = qualityLevels.filter((l) => l.height <= SD_MAX_HEIGHT)
    hlsInstance.autoLevelCapping = allowed.length > 0
      ? Math.max(...allowed.map((l) => l.index))
      : -1
    // If a forced level is now above the cap, drop back to auto.
    if (selectedLevel >= 0) {
      const sel = qualityLevels.find((l) => l.index === selectedLevel)
      if (sel && sel.height > SD_MAX_HEIGHT) {
        hlsInstance.currentLevel = -1
        setSelectedLevel(-1)
      }
    }
  }, [canUseHD, qualityLevels, selectedLevel, hls])

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
  function handlePlay() { 
    setIsPlaying(true)
    if (videoRef.current) party?.localPlay(videoRef.current.currentTime)
  }

  function handlePauseEvent() {
    setIsPlaying(false)
    const video = videoRef.current
    if (video) {
      party?.localPause(video.currentTime)
    }
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
  function handleCanPlay() {
    // canplay only fires after the browser has decoded at least one frame —
    // proof that the codec is supported. From here on, future buffer errors
    // are treated as transient (seek / quality switch) and go through the
    // normal recoverMediaError path instead of fast-failing to the trailer.
    hasEverPlayedRef.current = true
    player.setLoading(false)
  }

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
    log.warn({}, 'Video element error (may be codec / source issue, falling through to retry / fallback)')
    player.reportError('VIDEO_ERROR', 'Video element error')
  }

  function handleEnded() {
    const video = videoRef.current
    if (video && video.duration > 0) {
      player.saveProgress(video.duration, video.duration)
    }
    fetch('/api/v1/watch-history/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId, episodeId: episodeSlug || null }),
    }).catch(() => {})

    if (hasNextEpisode && onNextEpisode) {
      setAutoNextCountdown(5)
    }
    onEnded?.()
  }

  // Auto-next countdown
  useEffect(() => {
    if (autoNextCountdown === null || autoNextCountdown <= 0) return
    const timer = setTimeout(() => {
      if (autoNextCountdown === 1) {
        onNextEpisode?.()
      } else {
        setAutoNextCountdown(autoNextCountdown - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [autoNextCountdown, onNextEpisode])

  // ── Resume ──
  function handleResume(doResume: boolean) {
    setShowResumePrompt(false)
    const video = videoRef.current
    if (!video) return
    if (doResume) {
      // Clamp resume time to valid range (handles stale progress from different source)
      const safeDuration = video.duration && isFinite(video.duration) ? video.duration : Infinity
      video.currentTime = Math.max(0, Math.min(resumeTime, safeDuration - 1))
    }
    video.play().catch(() => {
      // Autoplay blocked — user will click play manually
      setIsPlaying(false)
    })
  }

  // ── Controls ──
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }, [])

  const seekThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setCurrentTime(time)
    
    if (seekThrottleRef.current) clearTimeout(seekThrottleRef.current)
    seekThrottleRef.current = setTimeout(() => {
      party?.localSeek(time)
    }, 800)
  }, [party])

  // ── Settings handlers ──
  function handlePlaybackRateChange(rate: number) {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
    setSettingsPanel('main')
  }

  function handleQualityChange(level: QualityLevel | null) {
    const hlsInstance = hls.getHls()
    if (!hlsInstance) return
    // Guard: SD users can't force a level above the cap.
    if (level && !canUseHD && level.height > SD_MAX_HEIGHT) return
    hlsInstance.currentLevel = level ? level.index : -1
    setSelectedLevel(level ? level.index : -1)
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

  // ── Keyboard: Escape for settings ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Derived ──
  const hasMultipleServers = servers.length > 1

  // ═══════════════════════════ RENDER ═══════════════════════════

  // All-servers-failed error — rendered OUTSIDE BasePlayer
  if (player.allServersFailed) {
    // Default reason if fast-fail didn't tag one (e.g. all retries exhausted)
    const reason = fallbackReason ?? 'other'
    const bannerTitle = reason === 'codec'
      ? 'Phim chưa có bản phát web tương thích trình duyệt'
      : 'Nguồn phim hiện không khả dụng'
    const bannerDesc = reason === 'codec'
      ? 'Nguồn hiện tại dùng codec 10-bit mà Chrome / Edge / Firefox chưa hỗ trợ phát. Đang chiếu trailer chính thức thay thế.'
      : 'Không kết nối được với máy chủ phát. Đang chiếu trailer chính thức thay thế. Bạn có thể thử lại sau.'

    if (movieMeta?.trailerUrl) {
      return (
        <div className="relative flex h-full w-full bg-black">
          <iframe
            src={movieMeta.trailerUrl}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {showFallbackBanner && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3 md:p-4">
              <div className="pointer-events-auto flex max-w-2xl items-start gap-3 rounded-xl bg-black/75 px-4 py-3 text-left text-white shadow-2xl backdrop-blur-md border border-white/10">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                  <Info className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-snug">{bannerTitle}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-white/65">{bannerDesc}</p>
                </div>
                <button
                  onClick={() => setShowFallbackBanner(false)}
                  className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                  title="Đóng"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

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

  // ── Inline error extra action (switch server) ──
  const inlineErrorExtra = player.hasError && !player.allServersFailed && hasMultipleServers ? (
    <button
      onClick={player.nextServer}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/30"
    >
      <ChevronRight className="h-3.5 w-3.5" />
      Đổi server
    </button>
  ) : undefined

  // ── Loading overlay with retry count ──
  const customLoading = player.isLoading && !player.hasError ? (
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
  ) : undefined

  // ── Server badge (top overlay) ──
  const serverBadge = hasMultipleServers ? (
    <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300`}>
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
  ) : undefined

  // ── Next episode button (left controls slot) ──
  const nextEpisodeBtn = hasNextEpisode && onNextEpisode ? (
    <button onClick={onNextEpisode} className="text-white/70 transition hover:text-white p-1" title="Tập tiếp theo">
      <SkipForward className="h-5 w-5" />
    </button>
  ) : undefined

  // ── Right controls: subtitle + settings + watch party ──
  const rightCtrl = (
    <>
      <div className="flex items-center gap-1">
        <CreateWatchPartyButton
          movieId={movieId}
          movieSlug={movieMeta?.movieSlug || ''}
          movieTitle={movieMeta?.movieTitle || ''}
          episodeSlug={episodeSlug}
          serverIndex={player.currentServerIndex}
          posterUrl={poster}
          onRoomCreated={(code: string) => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('terence:room-created', { detail: code }))
            }
          }}
        />

        {subtitles.length > 0 && (
          <button
            onClick={() => { setShowSettings(true); setSettingsPanel('subtitle') }}
            className={`p-1 transition ${activeSubtitle ? 'text-primary' : 'text-white/70 hover:text-white'}`}
          >
            <Subtitles className="h-5 w-5" />
          </button>
        )}
      </div>

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
                {qualityLevels.length > 0 && (
                  <button onClick={() => setSettingsPanel('quality')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition">
                    <span className="flex items-center gap-2"><MonitorPlay className="h-4 w-4" />Chất lượng</span>
                    <span className="text-xs text-white/50">
                      {selectedLevel === -1
                        ? 'Tự động'
                        : qualityLabel(qualityLevels.find((l) => l.index === selectedLevel)?.height || 0)}
                    </span>
                  </button>
                )}
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

            {settingsPanel === 'quality' && (
              <div className="py-1">
                <button onClick={() => setSettingsPanel('main')} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 border-b border-white/5">
                  ← Chất lượng
                </button>
                <button
                  onClick={() => handleQualityChange(null)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${selectedLevel === -1 ? 'text-primary font-semibold' : 'text-white/70'}`}
                >
                  <span>Tự động</span>
                  {selectedLevel === -1 && <span className="text-primary">✓</span>}
                </button>
                {qualityLevels.map((level) => {
                  const locked = !canUseHD && level.height > SD_MAX_HEIGHT
                  return (
                    <button
                      key={level.index}
                      onClick={() => locked
                        ? window.open('/tcoin', '_blank')
                        : handleQualityChange(level)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                        locked ? 'text-white/40' : selectedLevel === level.index ? 'text-primary font-semibold' : 'text-white/70'
                      }`}
                      title={locked ? 'Đổi 30 TCoin để mở khoá Full HD' : undefined}
                    >
                      <span className="flex items-center gap-1.5">
                        {qualityLabel(level.height)}
                        {level.height >= 1080 && (
                          <span className="rounded bg-primary/15 px-1 text-[9px] font-bold uppercase tracking-wide text-primary">HD+</span>
                        )}
                      </span>
                      {locked
                        ? <Lock className="h-3.5 w-3.5 text-amber-400" />
                        : selectedLevel === level.index && <span className="text-primary">✓</span>}
                    </button>
                  )
                })}
                {!canUseHD && qualityLevels.some((l) => l.height > SD_MAX_HEIGHT) && (
                  <p className="px-4 py-2 text-[10px] leading-snug text-white/40 border-t border-white/5">
                    Mở khoá Full HD bằng <span className="text-primary font-semibold">30 TCoin</span> trong trang TCoin.
                  </p>
                )}
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
    </>
  )

  return (
    <BasePlayer
      videoRef={videoRef}
      isPlaying={isPlaying}
      isLoading={player.isLoading && !player.hasError}
      currentTime={currentTime}
      duration={duration}
      buffered={buffered}
      hasError={player.hasError && !player.allServersFailed}
      errorMessage={player.errorMessage}
      onRetry={player.retry}
      extraErrorAction={inlineErrorExtra}
      onTogglePlay={togglePlay}
      onSeek={handleSeek}
      thumbnailAt={thumbnailAt}
      leftControls={nextEpisodeBtn}
      rightControls={rightCtrl}
      topOverlay={serverBadge}
      loadingOverlay={customLoading}
      showBigPlayButton={!showResumePrompt && !player.hasError && autoNextCountdown === null}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full"
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
            kind={sub.kind as React.TrackHTMLAttributes<HTMLTrackElement>['kind']}
            src={sub.url}
            srcLang={sub.lang}
            label={sub.label}
            default={sub.isDefault}
          />
        ))}
      </video>

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

      {/* Auto-next episode overlay */}
      {autoNextCountdown !== null && autoNextCountdown > 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl bg-card/90 border border-white/10 p-6 text-center shadow-2xl backdrop-blur-md max-w-sm mx-4">
            <p className="text-sm font-semibold text-white">Tập tiếp theo</p>
            <p className="mt-1.5 text-xs text-white/50">
              Tự động chuyển sau {autoNextCountdown} giây...
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => onNextEpisode?.()}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
              >
                <SkipForward className="inline h-4 w-4 mr-1" />
                Chuyển ngay
              </button>
              <button
                onClick={() => setAutoNextCountdown(null)}
                className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/20"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </BasePlayer>
  )
}
