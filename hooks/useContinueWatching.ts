'use client'

// ============================================
// useContinueWatching — reactive hook for continue watching UI
// ============================================
// Loads continue watching items from the watch history service.
// Automatically refreshes when history changes (via custom DOM event).
// SSR-safe: returns empty array during server render.

import { useState, useEffect, useCallback } from 'react'
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

  // Load items from service
  const refresh = useCallback(() => {
    const result = getContinueWatching(limit)
    setItems(result)
    setIsLoading(false)
  }, [limit])

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
  }, [refresh])

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
