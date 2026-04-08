'use client'

// ============================================
// usePlayer — Player state management hook
// ============================================
// Manages: server switching, episode selection, error handling with retry,
// resume playback, and auto-fallback logic.

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  saveWatchProgress as saveHistoryProgress,
  getResumeTime,
} from '@/lib/watch-history/service'

// ── Types ──

export interface PlayerServer {
  name: string
  episodes: PlayerServerEpisode[]
}

export interface PlayerServerEpisode {
  name: string
  slug: string
  url: string
}

/** Optional movie metadata for rich watch history entries */
export interface PlayerMovieMeta {
  movieSlug: string
  movieTitle: string
  posterUrl?: string
  thumbUrl?: string
  trailerUrl?: string
}

export interface UsePlayerOptions {
  /** List of available servers with their episodes */
  servers: PlayerServer[]
  /** Movie ID for progress tracking */
  movieId: string
  /** Current episode slug */
  episodeSlug?: string
  /** Movie metadata for watch history (title, slug, poster) */
  movieMeta?: PlayerMovieMeta
  /** Max retries per server before switching */
  maxRetries?: number
  /** Called when all servers exhausted */
  onAllServersFailed?: () => void
}

export interface UsePlayerReturn {
  // ── State ──
  currentServerIndex: number
  currentEpisodeIndex: number
  currentUrl: string | null
  currentServerName: string
  servers: PlayerServer[]
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  retryCount: number
  allServersFailed: boolean
  /** Incremented on each retry/reload to trigger re-mount of HLS */
  reloadKey: number

  // ── Actions ──
  setServer: (index: number) => void
  nextServer: () => void
  retry: () => void
  setEpisode: (slug: string) => void
  setLoading: (loading: boolean) => void
  clearError: () => void
  reportError: (errorType: string, details: string) => void
  markReady: () => void

  // ── Progress ──
  saveProgress: (currentTime: number, duration: number) => void
  getSavedProgress: () => number | null
}

export function usePlayer(options: UsePlayerOptions): UsePlayerReturn {
  const {
    servers,
    movieId,
    episodeSlug,
    movieMeta,
    maxRetries = 3,
    onAllServersFailed,
  } = options

  // ── State ──
  const [currentServerIndex, setCurrentServerIndex] = useState(0)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [allServersFailed, setAllServersFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0) // increment to force HLS reload

  // Track which servers we've tried for the current playback attempt
  const triedServersRef = useRef<Set<number>>(new Set())
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initialize episode index from slug ──
  useEffect(() => {
    if (!episodeSlug || servers.length === 0) return

    // Find the episode across all servers (prefer current server)
    for (let sIdx = 0; sIdx < servers.length; sIdx++) {
      const server = servers[sIdx]
      const epIdx = server.episodes.findIndex(
        (ep) => ep.slug === episodeSlug
      )
      if (epIdx !== -1) {
        setCurrentServerIndex(sIdx)
        setCurrentEpisodeIndex(epIdx)
        return
      }
    }
    // Slug not found — default to first episode
    setCurrentEpisodeIndex(0)
  }, [episodeSlug, servers])

  // ── Derived state ──
  const currentServer = servers[currentServerIndex] || null
  const currentEpisode = currentServer?.episodes[currentEpisodeIndex] || null
  const currentUrl = currentEpisode?.url || null
  const currentServerName = currentServer?.name || 'Server 1'

  // ── Switch server ──
  const setServer = useCallback((index: number) => {
    if (index < 0 || index >= servers.length) return
    setCurrentServerIndex(index)
    setRetryCount(0)
    setHasError(false)
    setErrorMessage('')
    setIsLoading(true)
    setAllServersFailed(false)
    setReloadKey((k) => k + 1)
    triedServersRef.current.clear()

    // Try to keep the same episode slug
    if (currentEpisode) {
      const targetServer = servers[index]
      const matchIdx = targetServer.episodes.findIndex(
        (ep) => ep.slug === currentEpisode.slug
      )
      if (matchIdx !== -1) {
        setCurrentEpisodeIndex(matchIdx)
      } else {
        setCurrentEpisodeIndex(Math.min(currentEpisodeIndex, targetServer.episodes.length - 1))
      }
    }
  }, [servers, currentEpisode, currentEpisodeIndex])

  // ── Next server (circular fallback) ──
  const nextServer = useCallback(() => {
    if (servers.length <= 1) {
      setAllServersFailed(true)
      setHasError(true)
      setErrorMessage('Không có server khả dụng. Vui lòng thử lại sau.')
      setIsLoading(false)
      onAllServersFailed?.()
      return
    }

    const nextIdx = (currentServerIndex + 1) % servers.length
    triedServersRef.current.add(currentServerIndex)

    // Check if we've tried all servers
    if (triedServersRef.current.size >= servers.length) {
      setAllServersFailed(true)
      setHasError(true)
      setErrorMessage('Tất cả các server đều không khả dụng. Vui lòng thử lại sau.')
      setIsLoading(false)
      onAllServersFailed?.()
      return
    }

    console.log(`[usePlayer] Switching to server ${nextIdx + 1} (${servers[nextIdx]?.name})`)
    setCurrentServerIndex(nextIdx)
    setRetryCount(0)
    setHasError(false)
    setErrorMessage('')
    setIsLoading(true)
    setReloadKey((k) => k + 1)

    // Keep same episode
    if (currentEpisode) {
      const targetServer = servers[nextIdx]
      const matchIdx = targetServer.episodes.findIndex(
        (ep) => ep.slug === currentEpisode.slug
      )
      if (matchIdx !== -1) {
        setCurrentEpisodeIndex(matchIdx)
      }
    }
  }, [servers, currentServerIndex, currentEpisode, onAllServersFailed])

  // ── Retry current server ──
  const retry = useCallback(() => {
    setRetryCount(0)
    setHasError(false)
    setErrorMessage('')
    setIsLoading(true)
    setAllServersFailed(false)
    setReloadKey((k) => k + 1) // force reload
    triedServersRef.current.clear()
  }, [])

  // ── Report error (triggers retry/fallback) ──
  const reportError = useCallback((errorType: string, details: string) => {
    setRetryCount((prev) => {
      const newCount = prev + 1
      console.warn(`[usePlayer] Error reported: ${errorType} — ${details} (retry ${newCount}/${maxRetries})`)

      if (newCount >= maxRetries) {
        // Max retries exhausted → switch server
        console.log('[usePlayer] Max retries reached, switching server...')
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => {
          nextServer()
        }, 500)
        return newCount
      }

      // Still have retries — show error and auto-retry after delay
      setHasError(true)
      setErrorMessage(`Đang thử lại... (${newCount}/${maxRetries})`)

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        setHasError(false)
        setErrorMessage('')
        setIsLoading(true)
        setReloadKey((k) => k + 1) // force HLS reload
      }, 2000)

      return newCount
    })
  }, [maxRetries, nextServer])

  // ── Set episode ──
  const setEpisode = useCallback((slug: string) => {
    if (!currentServer) return
    const idx = currentServer.episodes.findIndex((ep) => ep.slug === slug)
    if (idx !== -1) {
      setCurrentEpisodeIndex(idx)
      setRetryCount(0)
      setHasError(false)
      setErrorMessage('')
      setIsLoading(true)
      setAllServersFailed(false)
      setReloadKey((k) => k + 1)
      triedServersRef.current.clear()
    }
  }, [currentServer])

  // ── Loading / Error helpers ──
  const clearError = useCallback(() => {
    setHasError(false)
    setErrorMessage('')
  }, [])

  const markReady = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    setErrorMessage('')
    setRetryCount(0)
  }, [])

  // ── Progress management (localStorage + server API) ──
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

  // ── Cleanup timers ──
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  return {
    // State
    currentServerIndex,
    currentEpisodeIndex,
    currentUrl,
    currentServerName,
    servers,
    isLoading,
    hasError,
    errorMessage,
    retryCount,
    allServersFailed,
    reloadKey,

    // Actions
    setServer,
    nextServer,
    retry,
    setEpisode,
    setLoading: setIsLoading,
    clearError,
    reportError,
    markReady,

    // Progress
    saveProgress,
    getSavedProgress,
  }
}
