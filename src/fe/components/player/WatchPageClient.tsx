'use client'

// ============================================
// WatchPageClient — client component orchestrating the HLS player
// ============================================
// Uses the source adapter to normalize data into PlayerServer[] format,
// then passes it to HLSPlayer for playback.
// Wraps player with WatchPartyOverlay for watch party features.

import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { HLSPlayer } from '@/src/fe/components/player/HLSPlayer'
import { WatchPartyOverlay } from '@/src/fe/components/watch-party/WatchPartyOverlay'
import { AdGate } from '@/src/fe/components/player/AdGate'
import type { EpisodePlaybackData } from '@/lib/player/types'
import type { PlayerServer } from '@/src/fe/features/player/hooks/usePlayer'
import { mapDbPlaybackToPlayerSources } from '@/lib/player/source-adapter'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useWatchProgressEmitter, useWatchCompletedListener } from '@/src/fe/lib/realtime/hooks'

interface WatchPageClientProps {
  episodeData: EpisodePlaybackData
  movieId: string
  movieSlug: string
  movieTitle: string
  posterUrl?: string
  thumbUrl?: string
  trailerUrl?: string
  onEpisodeChange?: (episodeSlug: string) => void
  /** Additional servers from multi-server data */
  additionalServers?: PlayerServer[]
  /** TCoin hd-upgrade perk — unlocks Full HD quality levels. */
  canUseHD?: boolean
}

export function WatchPageClient({
  episodeData,
  movieId,
  movieSlug,
  movieTitle,
  posterUrl,
  thumbUrl,
  trailerUrl,
  additionalServers,
  canUseHD = false,
}: WatchPageClientProps) {
  const [loaded, setLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Use the source adapter to normalize DB playback data
  const { servers } = mapDbPlaybackToPlayerSources(episodeData, additionalServers)

  // Determine episode slug
  const currentEpSlug = episodeData.episode.episodeSlug
    || `tap-${episodeData.episode.episodeNumber}`

  const currentEpName = episodeData.episode.episodeName
    || `Tập ${episodeData.episode.episodeNumber}`

  // Pre-check loaded state (wait for component mount)
  useEffect(() => {
    setLoaded(true)
  }, [])

  // ── Realtime watch progress ──
  // Throttled to once per 15s in the client emitter; the server further
  // debounces DB writes and auto-awards TCoin at ≥92% via watch_complete.
  const { user } = useAuth()
  const userId = user?.id ?? null
  const realEpisodeId = (episodeData.episode.id && !episodeData.episode.id.startsWith('legacy-'))
    ? episodeData.episode.id : null
  const { emit: emitProgress, flush: flushProgress } = useWatchProgressEmitter(userId)

  useEffect(() => {
    const v = videoRef.current
    if (!v || !userId) return
    const handler = () => {
      if (!v.duration || isNaN(v.duration)) return
      emitProgress({
        movieId,
        episodeId: realEpisodeId,
        currentTime: v.currentTime,
        duration: v.duration,
      })
    }
    const onPause = () => {
      if (!v.duration || isNaN(v.duration)) return
      flushProgress({
        movieId,
        episodeId: realEpisodeId,
        currentTime: v.currentTime,
        duration: v.duration,
      })
    }
    v.addEventListener('timeupdate', handler)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', handler)
      v.removeEventListener('pause', onPause)
    }
  }, [userId, movieId, realEpisodeId, emitProgress, flushProgress])

  useWatchCompletedListener(userId, (p) => {
    if (p.movieId !== movieId) return
    if (p.rewarded && p.amount > 0) {
      toast.success(`Hoàn tất xem phim. +${p.amount} TCoin!`, { icon: null })
    }
  })

  const handleNextEpisode = useCallback(() => {
    if (episodeData.nextEpisode && (episodeData.nextEpisode.episodeSlug || episodeData.nextEpisode.episodeNumber)) {
      const slug = episodeData.nextEpisode.episodeSlug || `tap-${episodeData.nextEpisode.episodeNumber}`
      window.location.href = `/watch/${movieSlug}?ep=${slug}`
    }
  }, [episodeData.nextEpisode, movieSlug])

  // Error State: No servers available but check if we have an iframe primary source
  if (loaded && servers.length === 0) {
    const primarySource = episodeData.primarySource
    if (primarySource && (primarySource.sourceType === 'iframe' || primarySource.sourceType === 'youtube')) {
      return (
        <div className="relative flex h-full w-full bg-black">
          <iframe
            src={primarySource.url}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }

    return (
      <div className="relative flex h-full w-full items-center justify-center bg-black">
        <div className="relative z-10 flex flex-col items-center gap-4 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mb-2 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="h-8 w-8 text-red-500 drop-shadow-md" />
          </div>
          <div>
            <p className="text-lg font-bold text-white drop-shadow-md">Lỗi luồng phát</p>
            <p className="mt-1.5 text-sm text-white/50 max-w-[300px]">
              Không tìm thấy máy chủ khả dụng cho tập này. Vui lòng chọn tập khác hoặc thử lại sau.
            </p>
          </div>
        </div>
        {/* Dimmed backdrop */}
        {posterUrl && (
          <img src={posterUrl} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.jpg' }} className="absolute inset-0 h-full w-full object-cover opacity-10 blur-xl pointer-events-none" alt="" />
        )}
      </div>
    )
  }

  // Cinematic Loading State
  if (!loaded) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-[#050505] overflow-hidden">
        {/* Blurred Poster Background */}
        {posterUrl && (
          <img src={posterUrl} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.jpg' }} className="absolute inset-0 h-full w-full object-cover opacity-[0.15] blur-xl scale-105 pointer-events-none" alt="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 pointer-events-none" />
        
        {/* Loading UI */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-semibold tracking-wider text-white drop-shadow-md">CHUẨN BỊ LUỒNG PHÁT</p>
            <p className="text-[11px] text-white/40 uppercase tracking-widest">{movieTitle}</p>
          </div>
        </div>

        {/* Decorative loading-state control bar (not interactive — pointer-events-none).
            The real controls come from <HLSPlayer> once `loaded === true`. */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-none flex items-end px-6 pb-4" aria-hidden>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdGate placement="PRE_ROLL">
      <WatchPartyOverlay
        movieId={movieId}
        movieSlug={movieSlug}
        movieTitle={movieTitle}
        episodeId={(episodeData.episode.id && !episodeData.episode.id.startsWith('legacy-')) ? episodeData.episode.id : undefined}
        episodeSlug={currentEpSlug}
        episodeName={currentEpName}
        posterUrl={posterUrl}
        videoRef={videoRef}
      >
        <HLSPlayer
          videoRef={videoRef}
          servers={servers}
          movieId={movieId}
          episodeSlug={currentEpSlug}
          poster={posterUrl}
          subtitles={episodeData.subtitles}
          hasNextEpisode={!!episodeData.nextEpisode}
          onNextEpisode={handleNextEpisode}
          canUseHD={canUseHD}
          movieMeta={{
            movieSlug,
            movieTitle,
            posterUrl,
            thumbUrl,
            trailerUrl,
          }}
        />
      </WatchPartyOverlay>
    </AdGate>
  )
}
