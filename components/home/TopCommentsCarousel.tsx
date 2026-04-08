'use client'

// ============================================
// TopCommentsCarousel — "TOP BÌNH LUẬN" section
// ============================================
// Fetches top reviews from /api/v1/reviews/top and displays
// them in a horizontal carousel like RoPhim.
// Handles: loading, error, empty states (Frontend Rule #5)

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Eye, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface TopReview {
  id: string
  content: string | null
  rating: number
  likeCount: number
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
  movie: { id: string; title: string; slug: string; posterUrl: string | null }
}

export function TopCommentsCarousel() {
  const [reviews, setReviews] = useState<TopReview[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/v1/reviews/top')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setReviews(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.6
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  // Don't render if no reviews and not loading
  if (!loading && reviews.length === 0) return null

  return (
    <section className="py-8">
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        {/* Header */}
        <h2 className="mb-6 text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <span className="text-xl">🏆</span>
          TOP BÌNH LUẬN
        </h2>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[280px] flex-shrink-0 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-3 w-full skeleton rounded" />
                  </div>
                </div>
                <div className="h-3 w-2/3 skeleton rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Carousel */}
        {!loading && reviews.length > 0 && (
          <div className="relative">
            {/* Left arrow */}
            <button
              onClick={() => scroll('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10
                items-center justify-center rounded-full bg-white/10 border border-white/10
                backdrop-blur-sm carousel-arrow hover:bg-white/20"
              aria-label="Trước"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            >
              {reviews.map((review) => (
                <CommentCard key={review.id} review={review} />
              ))}
            </div>

            {/* Right arrow */}
            <button
              onClick={() => scroll('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10
                items-center justify-center rounded-full bg-white/10 border border-white/10
                backdrop-blur-sm carousel-arrow hover:bg-white/20"
              aria-label="Sau"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Comment Card ──
function CommentCard({ review }: { review: TopReview }) {
  const initial = review.user.name.charAt(0).toUpperCase()

  return (
    <div className="w-[280px] flex-shrink-0 rounded-xl bg-white/[0.03] border border-white/[0.06]
      p-4 transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.1]">
      {/* Top: Avatar + Username + Movie poster */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 overflow-hidden">
            {review.user.avatar ? (
              <img src={review.user.avatar} alt={review.user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary">{initial}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{review.user.name}</p>
          </div>
        </div>

        {/* Movie thumbnail */}
        {review.movie.posterUrl && (
          <Link href={`/movie/${review.movie.id}`} className="shrink-0">
            <img
              src={review.movie.posterUrl}
              alt={review.movie.title}
              className="h-14 w-10 rounded object-cover border border-white/10"
            />
          </Link>
        )}
      </div>

      {/* Comment text */}
      <p className="text-sm text-white/60 line-clamp-2 mb-3 leading-relaxed">
        {review.content || 'Không có nội dung'}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 text-white/30">
        <span className="flex items-center gap-1 text-xs">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <span className="flex items-center gap-1 text-xs">
          <MessageCircle className="h-3.5 w-3.5" />
          {review.likeCount}
        </span>
      </div>
    </div>
  )
}
