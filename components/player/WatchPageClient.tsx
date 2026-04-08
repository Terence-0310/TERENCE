'use client'

// ============================================
// WatchPageClient — client component orchestrating the HLS player
// ============================================
// Uses the source adapter to normalize data into PlayerServer[] format,
// then passes it to HLSPlayer for playback.
// Wraps player with WatchPartyOverlay for watch party features.

import { useState, useCallback, useEffect, useRef } from 'react'
import { HLSPlayer } from '@/components/player/HLSPlayer'
import { WatchPartyOverlay } from '@/components/watch-party/WatchPartyOverlay'
import type { EpisodePlaybackData } from '@/lib/player/types'
import type { PlayerServer } from '@/hooks/usePlayer'
import { mapDbPlaybackToPlayerSources } from '@/lib/player/source-adapter'

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

  const handleNextEpisode = useCallback(() => {
    if (episodeData.nextEpisode && (episodeData.nextEpisode.episodeSlug || episodeData.nextEpisode.episodeNumber)) {
      const slug = episodeData.nextEpisode.episodeSlug || `tap-${episodeData.nextEpisode.episodeNumber}`
      window.location.href = `/watch/${movieSlug}?ep=${slug}`
    }
  }, [episodeData.nextEpisode, movieSlug])

  if (!loaded || servers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-xs text-white/40">Đang tải player...</p>
        </div>
      </div>
    )
  }

  return (
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
        movieMeta={{
          movieSlug,
          movieTitle,
          posterUrl,
          thumbUrl,
          trailerUrl,
        }}
      />
    </WatchPartyOverlay>
  )
}
