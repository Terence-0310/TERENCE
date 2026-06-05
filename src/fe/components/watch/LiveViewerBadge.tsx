'use client'

// Presence tracker for the watch page. Joins the movie presence room via
// useMovieViewers (emits movie:join/leave) so the Top View "đang thịnh hành"
// board still counts live viewers — but renders NOTHING: the per-movie
// "X đang xem" badge was removed from the user-facing watch page on request.
// Keeping the hook here preserves Top View / dashboard live data unchanged.

import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useMovieViewers } from '@/src/fe/lib/realtime/hooks'

export function LiveViewerBadge({ movieId }: { movieId: string }) {
  const { user } = useAuth()
  // Track presence only — intentionally no UI.
  useMovieViewers(movieId, user?.id ?? null)
  return null
}
