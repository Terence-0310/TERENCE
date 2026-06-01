'use client'

// ============================================
// PageViewTracker — fire-and-forget page-view beacon
// ============================================
// Records a row in the PageView table (via /api/v1/analytics/track) once per
// mount. This is what populates the admin dashboard's "Lượt xem hôm nay" and
// the 7-day growth chart. When `movieId` is passed, the server also increments
// that movie's viewCount (used by the Top View leaderboard).
//
// Renders nothing. Safe to drop into any server-rendered page.

import { useEffect, useRef } from 'react'

export function PageViewTracker({ path, movieId }: { path: string; movieId?: string | null }) {
  // Guard against React's double-invoke in dev StrictMode so we don't double-count.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    fetch('/api/v1/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, movieId: movieId ?? null }),
      keepalive: true,
    }).catch(() => {
      /* analytics is best-effort — never disrupt the page */
    })
  }, [path, movieId])

  return null
}
