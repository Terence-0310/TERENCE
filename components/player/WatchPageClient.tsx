'use client'

// ============================================
// WatchPageClient — client component orchestrating player + progress
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { EnhancedVideoPlayer } from '@/components/player/EnhancedVideoPlayer'
import type { PlayableSource, PlayableSubtitle, EpisodePlaybackData } from '@/lib/player/types'
import { saveWatchProgress, getWatchProgress } from '@/lib/watch-progress'

interface WatchPageClientProps {
  episodeData: EpisodePlaybackData
  movieId: string
  movieSlug: string
  posterUrl?: string
  isLoggedIn: boolean
  onEpisodeChange?: (episodeSlug: string) => void
}

export function WatchPageClient({
  episodeData,
  movieId,
  movieSlug,
  posterUrl,
  isLoggedIn,
}: WatchPageClientProps) {
  const [currentSource, setCurrentSource] = useState<PlayableSource | null>(
    episodeData.primarySource,
  )
  const [initialTime, setInitialTime] = useState<number | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)

  // Load initial progress
  useEffect(() => {
    async function loadProgress() {
      if (isLoggedIn) {
        // Try server
        try {
          const res = await fetch(
            `/api/v1/progress?movieId=${movieId}&episodeId=${episodeData.episode.id}`,
          )
          if (res.ok) {
            const data = await res.json()
            if (data.progressSeconds > 10 && data.percent < 90) {
              setInitialTime(data.progressSeconds)
            }
          }
        } catch {
          // Fallback to localStorage
          const local = getWatchProgress(movieId as any, episodeData.episode.id)
          if (local && local.currentTime > 10) {
            setInitialTime(local.currentTime)
          }
        }
      } else {
        // Anonymous — localStorage only
        const local = getWatchProgress(movieId as any, episodeData.episode.id)
        if (local && local.currentTime > 10) {
          setInitialTime(local.currentTime)
        }
      }
      setLoaded(true)
    }
    loadProgress()
  }, [movieId, episodeData.episode.id, isLoggedIn])

  // Handle progress save
  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      // Always save to localStorage
      saveWatchProgress(movieId as any, currentTime, duration, episodeData.episode.id)

      // Also save to server if logged in (debounced by interval in player)
      if (isLoggedIn) {
        fetch('/api/v1/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId,
            episodeId: episodeData.episode.id,
            progressSeconds: Math.floor(currentTime),
            durationSeconds: Math.floor(duration),
          }),
        }).catch(() => {
          // Silently fail — localStorage is the fallback
        })
      }
    },
    [movieId, episodeData.episode.id, isLoggedIn],
  )

  // Handle source change
  const handleSourceChange = useCallback((source: PlayableSource) => {
    setCurrentSource(source)
  }, [])

  // Handle next episode
  const handleNextEpisode = useCallback(() => {
    if (episodeData.nextEpisode) {
      const slug = episodeData.nextEpisode.episodeSlug || `tap-${episodeData.nextEpisode.episodeNumber}`
      window.location.href = `/watch/${movieSlug}?ep=${slug}`
    }
  }, [episodeData.nextEpisode, movieSlug])

  if (!currentSource || !loaded) {
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
    <EnhancedVideoPlayer
      src={currentSource.url}
      type={currentSource.sourceType}
      poster={posterUrl}
      movieId={movieId}
      episodeId={episodeData.episode.id}
      subtitles={episodeData.subtitles}
      sources={episodeData.sources}
      onSourceChange={handleSourceChange}
      onNextEpisode={handleNextEpisode}
      hasNextEpisode={!!episodeData.nextEpisode}
      onProgress={handleProgress}
      initialTime={initialTime}
    />
  )
}
