'use client'

// Live "đang xem" badge for the watch page. Joins the movie presence room
// via useMovieViewers and shows the realtime viewer count. Renders nothing
// until at least one count arrives.

import { Eye } from 'lucide-react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useMovieViewers } from '@/src/fe/lib/realtime/hooks'

export function LiveViewerBadge({ movieId }: { movieId: string }) {
  const { user } = useAuth()
  const { viewerCount } = useMovieViewers(movieId, user?.id ?? null)

  if (viewerCount == null || viewerCount <= 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <Eye className="h-3.5 w-3.5" />
      {viewerCount.toLocaleString('vi-VN')} đang xem
    </span>
  )
}
