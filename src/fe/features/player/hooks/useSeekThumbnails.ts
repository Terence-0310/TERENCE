'use client'

// ============================================
// useSeekThumbnails — seek-bar hover preview source
// ============================================
// Asks /api/v1/thumbnails for an episode's sprite+VTT. If it isn't generated
// yet the API kicks off generation and replies `generating`; we poll until it
// is ready, then parse the WebVTT into cues and expose `thumbnailAt(time)` for
// the player's progress bar.

import { useEffect, useRef, useState, useCallback } from 'react'

interface Cue { start: number; end: number; x: number; y: number; w: number; h: number }
export interface SeekThumb { spriteUrl: string; x: number; y: number; w: number; h: number }

function parseTimecode(tc: string): number {
  // HH:MM:SS.mmm or MM:SS.mmm
  const parts = tc.trim().split(':')
  if (parts.length === 3) {
    return (+parts[0]) * 3600 + (+parts[1]) * 60 + parseFloat(parts[2])
  }
  if (parts.length === 2) {
    return (+parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(tc) || 0
}

function parseVtt(text: string): Cue[] {
  const cues: Cue[] = []
  const blocks = text.replace(/\r/g, '').split('\n\n')
  for (const block of blocks) {
    const arrow = block.indexOf('-->')
    if (arrow === -1) continue
    const lines = block.split('\n').filter(Boolean)
    const timeLine = lines.find((l) => l.includes('-->'))
    const xywhLine = lines.find((l) => l.includes('#xywh='))
    if (!timeLine || !xywhLine) continue
    const [startStr, endStr] = timeLine.split('-->')
    const m = xywhLine.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/)
    if (!m) continue
    cues.push({
      start: parseTimecode(startStr),
      end: parseTimecode(endStr),
      x: +m[1], y: +m[2], w: +m[3], h: +m[4],
    })
  }
  return cues.sort((a, b) => a.start - b.start)
}

export function useSeekThumbnails(
  movieId: string | null | undefined,
  ep: string | null | undefined,
): (time: number) => SeekThumb | null {
  const [cues, setCues] = useState<Cue[]>([])
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!movieId) return
    let cancelled = false
    let attempts = 0
    setCues([])
    setSpriteUrl(null)

    async function tick() {
      attempts++
      try {
        const qs = new URLSearchParams({ movieId: String(movieId) })
        if (ep) qs.set('ep', ep)
        const res = await fetch(`/api/v1/thumbnails?${qs.toString()}`)
        const json = await res.json().catch(() => null)
        const data = json?.data
        if (cancelled || !data) return

        if (data.status === 'ready' && data.vttUrl && data.spriteUrl) {
          const vtt = await fetch(data.vttUrl).then((r) => r.text()).catch(() => '')
          if (cancelled || !vtt) return
          setSpriteUrl(data.spriteUrl)
          setCues(parseVtt(vtt))
          return
        }
        // Still generating (or just triggered) — poll a bounded number of times.
        if (data.status === 'generating' && attempts < 45) {
          timerRef.current = setTimeout(tick, 4000)
        }
      } catch {
        /* ignore — preview is best-effort */
      }
    }

    // Small delay so we don't compete with initial playback start.
    timerRef.current = setTimeout(tick, 1500)
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [movieId, ep])

  return useCallback((time: number): SeekThumb | null => {
    if (!spriteUrl || cues.length === 0) return null
    let cue = cues.find((c) => time >= c.start && time < c.end)
    if (!cue) cue = time < cues[0].start ? cues[0] : cues[cues.length - 1]
    return { spriteUrl, x: cue.x, y: cue.y, w: cue.w, h: cue.h }
  }, [cues, spriteUrl])
}
