'use client'

// Plays one short. Only the ACTIVE slide mounts a real player (YouTube IFrame
// API / <video> / hls.js); the others just show the thumbnail, so scrolling a
// long feed stays light. Playback state (paused / muted) is controlled by the
// feed; progress is reported back for the progress bar.
//
// YouTube chrome (title bar, logo, "More videos") is hidden by rendering the
// iframe taller than its frame: YouTube letterboxes the video inside the extra
// height and pins its overlays to the iframe edges, which the frame crops off.

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ShortItem } from './types'

// ─── YouTube IFrame API (loaded once) ───────────────────────────

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  mute(): void
  unMute(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  destroy(): void
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT!)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

// ─── Component ──────────────────────────────────────────────────

interface Props {
  item: ShortItem
  active: boolean
  paused: boolean
  muted: boolean
  onProgress: (ratio: number) => void
  /** Called when the video can't be played (removed / embedding disabled). */
  onUnavailable?: () => void
}

export function ShortPlayer({ item, active, paused, muted, onProgress, onUnavailable }: Props) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const portrait = item.orientation === 'portrait'

  useEffect(() => {
    if (!active) {
      setPlaying(false)
      setFailed(false)
    }
  }, [active])

  const thumb = item.thumbnailUrl || item.movie?.posterUrl || '/placeholder.jpg'
  // Cover the player until real frames are rendering, and while paused
  // (hides YouTube's own pause screen).
  const showCover = !playing || paused || failed

  const fail = () => {
    setFailed(true)
    onUnavailable?.()
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Blurred fill behind landscape videos */}
      {!portrait && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
      )}

      {/* Video frame: full stage for portrait, centred 16:9 band for landscape */}
      <div
        className={`absolute overflow-hidden ${
          portrait ? 'inset-0' : 'left-0 top-1/2 aspect-video w-full -translate-y-1/2 shadow-[0_0_60px_rgba(0,0,0,0.6)]'
        }`}
      >
        {active && item.videoType === 'youtube' && (
          <YouTubeStage item={item} paused={paused} muted={muted} onProgress={onProgress} onPlaying={setPlaying} onError={fail} />
        )}
        {active && (item.videoType === 'mp4' || item.videoType === 'hls') && (
          <NativeStage item={item} paused={paused} muted={muted} onProgress={onProgress} onPlaying={setPlaying} onError={fail} />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={item.title}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            showCover ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {active && failed && (
        <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-6">
          <div className="flex max-w-xs items-center gap-3 rounded-2xl bg-black/75 px-4 py-3 text-left text-white backdrop-blur-md">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold">Video không khả dụng</p>
              <p className="text-xs text-white/60">Đang chuyển sang video tiếp theo…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface StageProps {
  item: ShortItem
  paused: boolean
  muted: boolean
  onProgress: (ratio: number) => void
  onPlaying: (playing: boolean) => void
  onError: () => void
}

function YouTubeStage({ item, paused, muted, onProgress, onPlaying, onError }: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  // Latest control values, read by player callbacks without re-creating it.
  const stateRef = useRef({ paused, muted })
  stateRef.current = { paused, muted }

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    let revealTimer: ReturnType<typeof setTimeout> | undefined
    const mount = document.createElement('div')
    hostRef.current?.appendChild(mount)

    loadYouTubeApi().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(mount, {
        videoId: item.videoUrl,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1,
          iv_load_policy: 3, disablekb: 1, fs: 0, cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            readyRef.current = true
            const p = playerRef.current!
            if (!stateRef.current.muted) p.unMute()
            if (stateRef.current.paused) p.pauseVideo()
            // autoplay=1 normally starts it already; a second playVideo() would
            // toggle state again and flash YouTube's centre icon.
            else if (p.getPlayerState() !== YT.PlayerState.PLAYING && p.getPlayerState() !== YT.PlayerState.BUFFERING) p.playVideo()
            timer = setInterval(() => {
              const d = p.getDuration?.() || 0
              if (d > 0) onProgress(Math.min(1, (p.getCurrentTime?.() || 0) / d))
            }, 250)
          },
          onStateChange: (e: { data: number }) => {
            // YouTube flashes a play/pause icon in the centre on every state
            // change; keep our cover up a moment longer so it is never seen.
            if (revealTimer) clearTimeout(revealTimer)
            if (e.data === YT.PlayerState.PLAYING) revealTimer = setTimeout(() => onPlaying(true), 900)
            else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) onPlaying(false)
            if (e.data === YT.PlayerState.ENDED) {
              // Loop like TikTok.
              playerRef.current?.seekTo(0, true)
              playerRef.current?.playVideo()
            }
          },
          // 100 = removed, 101/150 = embedding disabled by the owner.
          onError: () => { onPlaying(false); onError() },
        },
      })
    })

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (revealTimer) clearTimeout(revealTimer)
      readyRef.current = false
      try { playerRef.current?.destroy() } catch { /* already gone */ }
      playerRef.current = null
      mount.remove()
      onProgress(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.videoUrl])

  useEffect(() => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    if (paused) p.pauseVideo()
    else p.playVideo()
  }, [paused])

  useEffect(() => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    if (muted) p.mute()
    else p.unMute()
  }, [muted])

  return (
    <div
      ref={hostRef}
      // Taller than the frame (+90px top & bottom) so YouTube's overlays land
      // in the cropped letterbox. pointer-events-none: taps reach the feed.
      className="pointer-events-none absolute inset-x-0 -top-[90px] h-[calc(100%+180px)] [&>iframe]:h-full [&>iframe]:w-full"
    />
  )
}

function NativeStage({ item, paused, muted, onProgress, onPlaying, onError }: StageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let hls: { destroy(): void } | null = null
    const isHls = item.videoType === 'hls' || item.videoUrl.includes('.m3u8')

    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) return
        const instance = new Hls()
        instance.loadSource(item.videoUrl)
        instance.attachMedia(video)
        hls = instance
      })
    } else {
      video.src = item.videoUrl
    }
    return () => {
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
      onProgress(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.videoUrl, item.videoType])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(() => { /* autoplay blocked until a gesture */ })
  }, [paused])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 h-full w-full ${item.orientation === 'portrait' ? 'object-cover' : 'object-contain'}`}
      autoPlay
      loop
      muted={muted}
      playsInline
      onPlaying={() => onPlaying(true)}
      onError={onError}
      onTimeUpdate={(e) => {
        const v = e.currentTarget
        if (v.duration > 0) onProgress(v.currentTime / v.duration)
      }}
    />
  )
}
