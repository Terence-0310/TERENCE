'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { FavoriteButton } from '@/src/fe/components/shared/FavoriteButton'

interface Props {
  shareTitle: string
  /** DB id / slug / tmdbId of the movie — enables the favorite toggle. */
  movieId?: string | number
}

// Buttons in /watch/[id]. "Chia sẻ" uses the Web Share API with a clipboard
// fallback. "Yêu thích" toggles via /api/v1/favorites.
export function WatchActionButtons({ shareTitle, movieId }: Props) {
  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    const nav = window.navigator
    try {
      if (nav && 'share' in nav && typeof nav.share === 'function') {
        await nav.share({ title: shareTitle, url })
        return
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(url)
        toast.success('Đã sao chép liên kết.', { icon: null })
        return
      }
      toast.error('Trình duyệt không hỗ trợ chia sẻ.', { icon: null })
    } catch {
      // User cancelled the share sheet — silent.
    }
  }

  return (
    <>
      {movieId != null && <FavoriteButton movieId={movieId} />}
      <button
        type="button"
        onClick={handleShare}
        aria-label="Chia sẻ phim"
        title="Chia sẻ"
        className="rounded-lg bg-white/5 p-2.5 text-white/50 border border-white/[0.06] transition hover:bg-white/10 hover:text-white"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </>
  )
}
