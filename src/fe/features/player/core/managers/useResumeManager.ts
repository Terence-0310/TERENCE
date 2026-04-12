'use client'

import { useRef, useCallback, useEffect } from 'react'
import {
  saveWatchProgress as saveHistoryProgress,
  getResumeTime,
} from '@/lib/watch-history/service'
import type { PlayerMovieMeta, PlayerServerEpisode } from '../player.types'

export interface UseResumeManagerProps {
  movieId: string
  movieMeta?: PlayerMovieMeta
  currentEpisode: PlayerServerEpisode | null
  currentEpisodeIndex: number
  currentServerName: string
  currentServerIndex: number
}

export function useResumeManager({
  movieId,
  movieMeta,
  currentEpisode,
  currentEpisodeIndex,
  currentServerName,
  currentServerIndex
}: UseResumeManagerProps) {
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveProgress = useCallback((currentTime: number, duration: number) => {
    if (duration <= 0 || currentTime < 0) return
    const episode = currentEpisode
    if (!episode) return

    // 1. Save to localStorage immediately (instant, offline-capable)
    saveHistoryProgress({
      movieId,
      movieSlug: movieMeta?.movieSlug || movieId,
      movieTitle: movieMeta?.movieTitle || 'Phim',
      posterUrl: movieMeta?.posterUrl,
      thumbUrl: movieMeta?.thumbUrl,
      episodeId: episode.slug || `ep-${currentEpisodeIndex}`,
      episodeName: episode.name || `Tập ${currentEpisodeIndex + 1}`,
      episodeSlug: episode.slug,
      serverName: currentServerName,
      serverIndex: currentServerIndex,
      episodeIndex: currentEpisodeIndex,
      currentTime,
      duration,
      sourceUrl: episode.url,
    })

    // 2. Debounced save to server API (authenticated users)
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current)
    serverSaveTimerRef.current = setTimeout(() => {
      fetch('/api/v1/watch-history/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId,
          episodeId: episode.slug || null,
          currentTime: Math.round(currentTime),
          duration: Math.round(duration),
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }),
      }).catch(() => {}) // Non-critical — localStorage is primary
    }, 5000)
  }, [movieId, movieMeta, currentEpisode, currentEpisodeIndex, currentServerName, currentServerIndex])

  const getSavedProgress = useCallback((): number | null => {
    const episode = currentEpisode
    if (!episode) return null
    const episodeId = episode.slug || `ep-${currentEpisodeIndex}`
    return getResumeTime(movieId, episodeId)
  }, [movieId, currentEpisode, currentEpisodeIndex])

  return {
    saveProgress,
    getSavedProgress
  }
}
