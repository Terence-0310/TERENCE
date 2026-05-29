'use client'

import { Heart, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  shareTitle: string
}

// Replaces the previous title-only "dead" buttons in /watch/[id]. "Chia sẻ"
// now uses the Web Share API with a clipboard fallback. "Yêu thích" is
// rendered disabled with a tooltip until the wishlist backend exists.
export function WatchActionButtons({ shareTitle }: Props) {
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
      <button
        type="button"
        disabled
        aria-label="Yêu thích (đang phát triển)"
        title="Tính năng yêu thích đang được phát triển"
        className="rounded-lg bg-white/5 p-2.5 text-white/25 border border-white/[0.06] cursor-not-allowed"
      >
        <Heart className="h-4 w-4" />
      </button>
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
