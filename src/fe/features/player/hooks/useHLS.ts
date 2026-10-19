'use client'

// ============================================
// useHLS — Core HLS.js initialization hook
// ============================================
// Handles HLS.js lifecycle: load, attach, error recovery, destroy
// Falls back to native HLS on Safari

import { useRef, useCallback, useEffect } from 'react'
import type Hls from 'hls.js'
import { logger } from '@/src/fe/lib/logger'

const log = logger.child({ module: 'useHLS' })

export interface UseHLSOptions {
  /** Callback when manifest parsed and ready to play */
  onReady?: () => void
  /** Callback on HLS error (fatal or non-fatal) */
  onError?: (errorType: string, details: string, fatal: boolean) => void
  /** Callback when quality levels are loaded */
  onLevelsLoaded?: (levels: { height: number; width: number; bitrate: number }[]) => void
}

export interface UseHLSReturn {
  /** Load a new HLS source onto the video element */
  loadSource: (videoElement: HTMLVideoElement, src: string) => Promise<void>
  /** Destroy the current HLS instance and cleanup */
  destroy: () => void
  /** Get the current HLS instance (for advanced operations) */
  getHls: () => Hls | null
  /** Check if native HLS is supported (Safari) */
  isNativeHLS: (videoElement: HTMLVideoElement) => boolean
  /** Attempt to recover from a media error */
  recoverMediaError: () => boolean
  /** Attempt to recover from a network error */
  recoverNetworkError: () => boolean
}

export function useHLS(options: UseHLSOptions = {}): UseHLSReturn {
  const hlsRef = useRef<Hls | null>(null)
  const isNativeRef = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Track recovery attempts to prevent infinite loops
  const mediaRecoveryAttemptRef = useRef(0)
  const networkRecoveryAttemptRef = useRef(0)
  const MAX_RECOVERY_ATTEMPTS = 2

  // Check if the browser natively supports HLS (Safari, iOS)
  const isNativeHLS = useCallback((videoElement: HTMLVideoElement): boolean => {
    return !!videoElement.canPlayType('application/vnd.apple.mpegurl')
  }, [])

  // Destroy current HLS instance
  const destroy = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy()
      } catch (e) {
        log.warn({ err: e instanceof Error ? e.message : e }, 'Error destroying HLS instance')
      }
      hlsRef.current = null
    }
    isNativeRef.current = false
    mediaRecoveryAttemptRef.current = 0
    networkRecoveryAttemptRef.current = 0
  }, [])

  // Route OPhim / KKPhim master m3u8 URLs through our HLS proxy so it can
  // inject a CODECS= attribute the upstream playlist is missing. Browser
  // then knows the exact codec, skips auto-detection, and avoids the
  // Chromium "audio decoder initialization failed (kUnsupportedConfig)"
  // crash that happens on these CDN streams.
  function maybeProxyM3U8(src: string): string {
    if (typeof window === 'undefined') return src
    if (!/\.m3u8(?:\?|$)/i.test(src)) return src
    try {
      const u = new URL(src, window.location.origin)
      if (u.origin === window.location.origin) return src
      if (!/opstream\d*\.com|phimimg\.com/i.test(u.hostname)) return src
      return `/api/hls-proxy?u=${encodeURIComponent(u.href)}`
    } catch {
      return src
    }
  }

  // Load a source onto a video element
  const loadSource = useCallback(async (videoElement: HTMLVideoElement, rawSrc: string) => {
    const src = maybeProxyM3U8(rawSrc)
    // Always destroy previous instance first
    destroy()

    // 1. Prefer hls.js wherever MSE exists. Recent Chrome also reports native
    //    HLS support via canPlayType, but its native path fails on these CDN
    //    streams and loses quality selection — so native is only the fallback
    //    for browsers without MSE (iOS Safari).
    const HlsLib = (await import('hls.js')).default

    if (!HlsLib.isSupported() && isNativeHLS(videoElement)) {
      isNativeRef.current = true
      videoElement.src = src

      // Listen for native error
      const handleNativeError = () => {
        optionsRef.current.onError?.('NATIVE_ERROR', 'Native HLS playback error', true)
      }
      videoElement.addEventListener('error', handleNativeError, { once: true })

      // Listen for loadedmetadata as "ready"
      videoElement.addEventListener('loadedmetadata', () => {
        optionsRef.current.onReady?.()
      }, { once: true })

      return
    }

    // 2. hls.js
    if (!HlsLib.isSupported()) {
      optionsRef.current.onError?.('HLS_NOT_SUPPORTED', 'Browser does not support HLS.js', true)
      return
    }

    // 3. Create HLS instance with production config
    const hls = new HlsLib({
      startLevel: -1,             // Auto quality selection
      capLevelToPlayerSize: true,  // Don't load higher quality than player size
      maxBufferLength: 30,         // Max buffer ahead in seconds
      maxMaxBufferLength: 60,      // Absolute max buffer
      // Disable worker — the worker-context demuxer occasionally builds an
      // AudioSpecificConfig that Chromium's decoder rejects with
      // DECODER_ERROR_NOT_SUPPORTED (kUnsupportedConfig). Demuxing on the
      // main thread sidesteps the issue at a small CPU cost.
      enableWorker: false,
      lowLatencyMode: false,       // Not live streaming
      backBufferLength: 30,        // Keep 30s of back buffer
      maxBufferHole: 0.5,          // Max gap tolerance
      fragLoadingTimeOut: 20000,   // 20s timeout for fragment loading
      manifestLoadingTimeOut: 15000, // 15s timeout for manifest
      levelLoadingTimeOut: 15000,  // 15s timeout for level loading
      // OPhim / KKPhim master playlists usually ship without a CODECS=
      // attribute. Forcing AAC LC matches what these CDNs actually serve
      // (verified via ffprobe) and avoids hls.js falling back to HE-AAC.
      defaultAudioCodec: 'mp4a.40.2',
    })

    hlsRef.current = hls

    // Attach media and load source
    hls.loadSource(src)
    hls.attachMedia(videoElement)

    // Event: Manifest parsed (ready to play)
    hls.on(HlsLib.Events.MANIFEST_PARSED, (_event, data) => {
      // Reset recovery counters on success
      mediaRecoveryAttemptRef.current = 0
      networkRecoveryAttemptRef.current = 0

      optionsRef.current.onReady?.()

      // Report available quality levels
      if (data.levels && optionsRef.current.onLevelsLoaded) {
        optionsRef.current.onLevelsLoaded(
          data.levels.map((l) => ({
            height: l.height,
            width: l.width,
            bitrate: l.bitrate,
          }))
        )
      }
    })

    // Event: Error handling
    hls.on(HlsLib.Events.ERROR, (_event, data) => {
      const { type, details, fatal } = data

      log.warn({ type, details, fatal }, 'HLS error')

      optionsRef.current.onError?.(type, details, fatal)
    })
  }, [destroy, isNativeHLS])

  // Recovery methods — return true if recovery was attempted, false if exhausted
  const recoverMediaError = useCallback((): boolean => {
    if (hlsRef.current && mediaRecoveryAttemptRef.current < MAX_RECOVERY_ATTEMPTS) {
      mediaRecoveryAttemptRef.current++
      log.info({ attempt: mediaRecoveryAttemptRef.current, max: MAX_RECOVERY_ATTEMPTS }, 'Media error recovery attempt')
      hlsRef.current.recoverMediaError()
      return true
    }
    log.warn({}, 'Media error recovery exhausted')
    return false
  }, [])

  const recoverNetworkError = useCallback((): boolean => {
    if (hlsRef.current && networkRecoveryAttemptRef.current < MAX_RECOVERY_ATTEMPTS) {
      networkRecoveryAttemptRef.current++
      log.info({ attempt: networkRecoveryAttemptRef.current, max: MAX_RECOVERY_ATTEMPTS }, 'Network error recovery attempt')
      hlsRef.current.startLoad()
      return true
    }
    log.warn({}, 'Network error recovery exhausted')
    return false
  }, [])

  // Get current instance
  const getHls = useCallback((): Hls | null => {
    return hlsRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy()
    }
  }, [destroy])

  return {
    loadSource,
    destroy,
    getHls,
    isNativeHLS,
    recoverMediaError,
    recoverNetworkError,
  }
}
