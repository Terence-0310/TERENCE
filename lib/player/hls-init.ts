// ============================================
// HLS Init Helper — initializes HLS.js on a video element
// ============================================

import type Hls from 'hls.js'

export interface HlsInitResult {
  hls: Hls | null
  destroy: () => void
}

export interface HlsInitOptions {
  videoElement: HTMLVideoElement
  src: string
  onManifestParsed?: () => void
  onError?: (fatal: boolean, details: string) => void
  onLevelsLoaded?: (levels: { height: number; width: number; bitrate: number }[]) => void
}

/**
 * Initializes HLS.js on a video element.
 * Falls back to native HLS (Safari) if available.
 * Returns a cleanup function.
 */
export async function initHls(options: HlsInitOptions): Promise<HlsInitResult> {
  const { videoElement, src, onManifestParsed, onError, onLevelsLoaded } = options

  // Check native HLS support first (Safari)
  if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    videoElement.src = src
    onManifestParsed?.()
    return { hls: null, destroy: () => { videoElement.src = '' } }
  }

  const HlsLib = (await import('hls.js')).default

  if (!HlsLib.isSupported()) {
    onError?.(true, 'HLS_NOT_SUPPORTED')
    return { hls: null, destroy: () => {} }
  }

  const hls = new HlsLib({
    startLevel: -1, // auto quality
    capLevelToPlayerSize: true,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    enableWorker: true,
  })

  hls.loadSource(src)
  hls.attachMedia(videoElement)

  hls.on(HlsLib.Events.MANIFEST_PARSED, (_event, data) => {
    onManifestParsed?.()
    if (data.levels && onLevelsLoaded) {
      onLevelsLoaded(
        data.levels.map((l) => ({
          height: l.height,
          width: l.width,
          bitrate: l.bitrate,
        }))
      )
    }
  })

  hls.on(HlsLib.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      console.error('[HLS] Fatal error:', data.type, data.details)
      onError?.(true, data.details)

      // Try recovery
      switch (data.type) {
        case HlsLib.ErrorTypes.NETWORK_ERROR:
          console.log('[HLS] Attempting network recovery...')
          hls.startLoad()
          break
        case HlsLib.ErrorTypes.MEDIA_ERROR:
          console.log('[HLS] Attempting media recovery...')
          hls.recoverMediaError()
          break
        default:
          // Cannot recover
          break
      }
    } else {
      onError?.(false, data.details)
    }
  })

  return {
    hls,
    destroy: () => {
      hls.destroy()
    },
  }
}
