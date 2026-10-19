'use client'

// ============================================
// useContinueWatching — reactive hook for continue watching UI
// ============================================
// Loads continue watching items from the watch history service.
// Automatically refreshes when history changes (via custom DOM event).
// SSR-safe: returns empty array during server render.

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { ContinueWatchingItem } from '@/types/watch-history'
import {
  getContinueWatching,
  removeContinueWatching as removeItem,
  removeMovieHistory,
  clearAllHistory,
} from '@/lib/watch-history/service'
import { WATCH_HISTORY_CHANGE_EVENT } from '@/lib/watch-history/constants'

interface UseContinueWatchingOptions {
  /** Maximum items to return (default 20) */
  limit?: number
}

interface UseContinueWatchingReturn {
  /** Continue watching items, sorted by most recent */
  items: ContinueWatchingItem[]
  /** Whether items are being loaded (true on first render) */
  isLoading: boolean
  /** Manually refresh the list */
  refresh: () => void
  /** Remove a specific episode from continue watching */
  removeEpisode: (movieId: string, episodeId: string) => void
  /** Remove all history for a movie */
  removeMovie: (movieId: string) => void
  /** Clear all watch history */
  clearAll: () => void
}

export function useContinueWatching(
  options: UseContinueWatchingOptions = {},
): UseContinueWatchingReturn {
  const { limit = 20 } = options
  const [items, setItems] = useState<ContinueWatchingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { status } = useSession()

  // Load items from service
  const refresh = useCallback(() => {
    const result = getContinueWatching(limit)
    setItems(result)
    setIsLoading(false)
  }, [limit])

  // Merge server-side data (cross-device sync) — signed-in users only.
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/v1/watch-history/continue?limit=' + limit)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.items?.length) return
        setItems((prev) => {
          const localIds = new Set(prev.map((p) => p.movieId))
          const serverExtra: ContinueWatchingItem[] = data.items
            .filter((s: any) => !localIds.has(s.movie?.id))
            .map((s: any) => ({
              movieId: s.movie.id,
              movieSlug: s.movie.slug,
              movieTitle: s.movie.title,
              posterUrl: s.movie.posterUrl,
              thumbUrl: s.movie.thumbUrl,
              episodeId: s.episode?.id || '',
              episodeName: s.episode?.episodeName || 'Tập Full',
              episodeSlug: s.episode?.episodeSlug,
              currentTime: s.currentTime,
              duration: s.duration || 0,
              progressPercent: s.progress,
              lastWatchedAt: s.lastWatchedAt,
              completed: s.isCompleted,
              serverName: '',
              serverIndex: 0,
              episodeIndex: 0,
              sourceUrl: '',
            }))
          if (serverExtra.length === 0) return prev
          return [...prev, ...serverExtra].slice(0, limit)
        })
      })
      .catch(() => {}) // Non-critical
  }, [status, limit])

  // Initial load + listen for changes
  useEffect(() => {
    refresh()

    // Listen for custom event dispatched by storage layer on writes
    const handleChange = () => refresh()
    window.addEventListener(WATCH_HISTORY_CHANGE_EVENT, handleChange)

    // Also listen for cross-tab storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'terence:watch-history') {
        refresh()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(WATCH_HISTORY_CHANGE_EVENT, handleChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [refresh, limit])

  const removeEpisode = useCallback(
    (movieId: string, episodeId: string) => {
      removeItem(movieId, episodeId)
      // refresh() will be triggered by the WATCH_HISTORY_CHANGE_EVENT
      // emitted by storage.ts, but also update immediately for snappiness
      refresh()
    },
    [refresh],
  )

  const removeMovie = useCallback(
    (movieId: string) => {
      removeMovieHistory(movieId)
      refresh()
    },
    [refresh],
  )

  const clearAll = useCallback(() => {
    clearAllHistory()
    refresh()
  }, [refresh])

  return {
    items,
    isLoading,
    refresh,
    removeEpisode,
    removeMovie,
    clearAll,
  }
}
