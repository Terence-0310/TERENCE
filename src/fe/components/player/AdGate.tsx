'use client'

// ============================================
// AdGate — pre-roll ad wrapper for the HLS player
// ============================================
// Blocks playback of `children` until either:
//   1. /api/ads/active reports the user is ad-free, or
//   2. there's no eligible ad, or
//   3. the user watches the ad to completion / hits "Skip".
//
// Designed so the existing HLSPlayer is untouched — drop this wrapper
// around it (or above WatchPartyOverlay) and ads happen for free.
//
// Supported media URLs:
//   - Direct video file (.mp4, .m3u8, etc.) → rendered via <video>
//   - YouTube watch / share / embed URL → rendered via <iframe>, with the
//     duration-driven countdown used for non-video ads (we can't rely on the
//     YouTube IFrame API "ended" event because mobile autoplay policy may
//     pause the embed; counting `duration` matches what the ad copy promised).

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'

// ─── YouTube URL handling ──────────────────────────────────────
// Accepts every reasonable user-pasted shape:
//   https://www.youtube.com/watch?v=ID
//   https://youtu.be/ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/shorts/ID
function extractYoutubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/]+)/)
      if (m) return m[2]
    }
  } catch {
    /* malformed url */
  }
  return null
}

function buildYoutubeEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    disablekb: '1',
    playsinline: '1',
    fs: '0',
    // Loop the clip in case the ad's `duration` countdown outlasts the video
    // — keeps the screen visually alive instead of going black.
    loop: '1',
    playlist: videoId,
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

interface ActiveAd {
  id: string
  title: string
  type: 'VIDEO' | 'IMAGE' | 'BANNER' | string
  placement: string
  duration: number | null
  mediaUrl: string
  targetUrl: string | null
  skipAfterSeconds: number | null
}

interface ActiveAdResponse {
  ad: ActiveAd | null
  adFree: boolean
}

async function fetchActiveAd(placement: string): Promise<ActiveAdResponse> {
  try {
    const res = await fetch(`/api/ads/active?placement=${placement}`, { cache: 'no-store' })
    if (!res.ok) return { ad: null, adFree: false }
    return await res.json()
  } catch {
    return { ad: null, adFree: false }
  }
}

function postAdEvent(adId: string, event: 'skip' | 'complete' | 'click', placement?: string) {
  // Fire-and-forget — never delay the player on a tracking call.
  fetch('/api/ads/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adId, event, placement }),
    keepalive: true,
  }).catch(() => {})
}

interface AdGateProps {
  children: React.ReactNode
  /** Placement key to query. Defaults to PRE_ROLL. */
  placement?: string
}

export function AdGate({ children, placement = 'PRE_ROLL' }: AdGateProps) {
  const [phase, setPhase] = useState<'loading' | 'showing-ad' | 'done'>('loading')
  const [ad, setAd] = useState<ActiveAd | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchActiveAd(placement).then((res) => {
      if (cancelled) return
      if (res.adFree || !res.ad) {
        setPhase('done')
        return
      }
      setAd(res.ad)
      setPhase('showing-ad')
    })
    return () => { cancelled = true }
  }, [placement])

  if (phase === 'loading') {
    return <div className="flex h-full w-full items-center justify-center bg-black text-white/40 text-sm">Đang tải…</div>
  }

  if (phase === 'showing-ad' && ad) {
    return (
      <AdOverlay
        ad={ad}
        placement={placement}
        onFinish={() => setPhase('done')}
      />
    )
  }

  return <>{children}</>
}

// ─── Overlay UI ────────────────────────────────────────────────

interface AdOverlayProps {
  ad: ActiveAd
  placement: string
  onFinish: () => void
}

function AdOverlay({ ad, placement, onFinish }: AdOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [canSkip, setCanSkip] = useState(false)
  const sentCompleteRef = useRef(false)

  const totalDuration = ad.duration ?? 15
  const skipAt = ad.skipAfterSeconds

  // Render mode: native <video> for direct files, YouTube iframe for YT URLs,
  // <img> fallback for banner / image ads.
  const youtubeId = ad.type === 'VIDEO' ? extractYoutubeId(ad.mediaUrl) : null
  const isYoutube = !!youtubeId
  const isNativeVideo = ad.type === 'VIDEO' && !isYoutube

  useEffect(() => {
    // Unified setInterval-driven countdown for every ad type. We deliberately
    // do NOT bind to `video.currentTime` or YouTube's onStateChange because:
    //   - Looped short clips (e.g. 10s MP4 on a 15s slot) never fire `ended`
    //   - YouTube IFrame API messages are unreliable on muted autoplay
    //   - Brave / strict-cookie browsers can silently drop the embed
    // Driving the countdown ourselves means the ad slot always closes on
    // time so the user reaches the actual movie.
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1
        if (skipAt != null && next >= skipAt) setCanSkip(true)
        if (next >= totalDuration) {
          clearInterval(t)
          if (!sentCompleteRef.current) {
            sentCompleteRef.current = true
            postAdEvent(ad.id, 'complete', placement)
          }
          onFinish()
        }
        return next
      })
    }, 1000)

    // Kick the video element so muted autoplay actually starts.
    if (isNativeVideo) {
      const v = videoRef.current
      if (v) {
        v.muted = true
        v.play().catch(() => { /* user-gesture-required; clip stays paused but countdown still runs */ })
      }
    }
    return () => clearInterval(t)
  }, [isNativeVideo, ad.id, placement, skipAt, totalDuration, onFinish])

  function handleSkip() {
    postAdEvent(ad.id, 'skip', placement)
    onFinish()
  }

  function handleClickThrough() {
    if (!ad.targetUrl) return
    postAdEvent(ad.id, 'click', placement)
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer')
  }

  const remaining = Math.max(0, totalDuration - elapsed)

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {isYoutube && youtubeId ? (
        <iframe
          src={buildYoutubeEmbedSrc(youtubeId)}
          className="absolute inset-0 h-full w-full"
          title={ad.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : isNativeVideo ? (
        <video
          ref={videoRef}
          src={ad.mediaUrl}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          muted
          loop
          onClick={handleClickThrough}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.mediaUrl}
          alt={ad.title}
          className="h-full w-full object-contain cursor-pointer"
          onClick={handleClickThrough}
        />
      )}

      {/* Top label: brand tag + click-through */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white/80 uppercase tracking-wider">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          Quảng cáo · {ad.title}
        </div>
        {ad.targetUrl && (
          <button
            onClick={handleClickThrough}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white hover:bg-black/90 transition"
          >
            Tìm hiểu thêm <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Bottom: countdown + skip */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full bg-black/70 backdrop-blur-sm px-3 py-1.5 text-xs font-mono font-bold text-white/80 tabular-nums">
          {remaining}s
        </div>
        {canSkip ? (
          <button
            onClick={handleSkip}
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-1.5 text-xs font-bold hover:bg-white/90 transition"
          >
            Bỏ qua <X className="w-3.5 h-3.5" />
          </button>
        ) : skipAt != null ? (
          <div className="rounded-full bg-black/70 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white/60">
            Bỏ qua sau {Math.max(0, skipAt - elapsed)}s
          </div>
        ) : null}
      </div>

      {/* Footer: subtle TCoin upsell — only on shorter ads */}
      <div className="absolute bottom-4 left-4 right-32 sm:right-40">
        <a
          href="/tcoin#mua-tcoin"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/25 transition"
        >
          Xóa quảng cáo với 50 TCoin (7 ngày) →
        </a>
      </div>
    </div>
  )
}
