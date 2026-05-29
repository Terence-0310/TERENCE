'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PlayerServer } from '../player.types'
import { logger } from '@/src/fe/lib/logger'

const log = logger.child({ module: 'useSourceResolver' })

export interface UseSourceResolverProps {
  servers: PlayerServer[]
  episodeSlug?: string
  maxRetries?: number
  onAllServersFailed?: () => void
}

export function useSourceResolver({
  servers,
  episodeSlug,
  maxRetries = 3,
  onAllServersFailed,
}: UseSourceResolverProps) {
  const [currentServerIndex, setCurrentServerIndex] = useState(0)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [allServersFailed, setAllServersFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const triedServersRef = useRef<Set<number>>(new Set())
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!episodeSlug || servers.length === 0) return

    for (let sIdx = 0; sIdx < servers.length; sIdx++) {
      const server = servers[sIdx]
      const epIdx = server.episodes.findIndex((ep) => ep.slug === episodeSlug)
      if (epIdx !== -1) {
        setCurrentServerIndex(sIdx)
        setCurrentEpisodeIndex(epIdx)
        return
      }
    }
    setCurrentEpisodeIndex(0)
  }, [episodeSlug, servers])

  const currentServer = servers[currentServerIndex] || null
  const currentEpisode = currentServer?.episodes[currentEpisodeIndex] || null
  const currentUrl = currentEpisode?.url || null
  const currentServerName = currentServer?.name || 'Server 1'

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

    if (currentEpisode) {
      const targetServer = servers[index]
      const matchIdx = targetServer.episodes.findIndex((ep) => ep.slug === currentEpisode.slug)
      if (matchIdx !== -1) {
        setCurrentEpisodeIndex(matchIdx)
      } else {
        setCurrentEpisodeIndex(Math.min(currentEpisodeIndex, targetServer.episodes.length - 1))
      }
    }
  }, [servers, currentEpisode, currentEpisodeIndex])

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

    if (triedServersRef.current.size >= servers.length) {
      setAllServersFailed(true)
      setHasError(true)
      setErrorMessage('Tất cả các server đều không khả dụng. Vui lòng thử lại sau.')
      setIsLoading(false)
      onAllServersFailed?.()
      return
    }

    log.info({ index: nextIdx + 1, name: servers[nextIdx]?.name }, 'Switching to server')
    setCurrentServerIndex(nextIdx)
    setRetryCount(0)
    setHasError(false)
    setErrorMessage('')
    setIsLoading(true)
    setReloadKey((k) => k + 1)

    if (currentEpisode) {
      const targetServer = servers[nextIdx]
      const matchIdx = targetServer.episodes.findIndex((ep) => ep.slug === currentEpisode.slug)
      if (matchIdx !== -1) {
        setCurrentEpisodeIndex(matchIdx)
      }
    }
  }, [servers, currentServerIndex, currentEpisode, onAllServersFailed])

  const retry = useCallback(() => {
    setRetryCount(0)
    setHasError(false)
    setErrorMessage('')
    setIsLoading(true)
    setAllServersFailed(false)
    setReloadKey((k) => k + 1)
    triedServersRef.current.clear()
  }, [])

  const reportError = useCallback((errorType: string, details: string) => {
    setRetryCount((prev) => {
      const newCount = prev + 1
      log.warn({ errorType, details, retry: newCount, max: maxRetries }, 'Error reported')

      if (newCount >= maxRetries) {
        log.info({}, 'Max retries reached, switching server')
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => {
          nextServer()
        }, 500)
        return newCount
      }

      setHasError(true)
      setErrorMessage(`Đang thử lại... (${newCount}/${maxRetries})`)

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        setHasError(false)
        setErrorMessage('')
        setIsLoading(true)
        setReloadKey((k) => k + 1)
      }, 2000)

      return newCount
    })
  }, [maxRetries, nextServer])

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

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  return {
    currentServerIndex,
    currentEpisodeIndex,
    currentServer,
    currentEpisode,
    currentUrl,
    currentServerName,
    isLoading,
    hasError,
    errorMessage,
    retryCount,
    allServersFailed,
    reloadKey,
    setServer,
    nextServer,
    retry,
    setEpisode,
    setLoading: setIsLoading,
    clearError,
    reportError,
    markReady,
  }
}
