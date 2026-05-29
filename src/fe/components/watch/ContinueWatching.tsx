'use client'

// ============================================
// ContinueWatching — Section for homepage
// ============================================
// Fetches and displays user's in-progress movies.
// Combines localStorage (instant) + API (persistent) data.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Clock, X, Loader2 } from 'lucide-react'
import { getContinueWatching as getLocalContinueWatching } from '@/lib/watch-history/service'
import { formatTime } from '@/lib/player/time-format'

function FallbackImage({ src, alt, className, sizes }: { src: string; alt: string; className: string; sizes: string }) {
  const [imgError, setImgError] = useState(false)
  return (
    <Image
      src={imgError ? '/placeholder.jpg' : src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={() => setImgError(true)}
    />
  )
}

interface ContinueItem {
  movieId: string
  movieSlug: string
  movieTitle: string
  posterUrl?: string
  thumbUrl?: string
  episodeId: string
  episodeName: string
  episodeSlug?: string
  progressPercent: number
  currentTime: number
  duration: number
  lastWatchedAt: string
}

export function ContinueWatchingSection() {
  const [items, setItems] = useState<ContinueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 1. Instant: load from localStorage
    const localItems = getLocalContinueWatching(10)
    const mapped: ContinueItem[] = localItems.map((item) => ({
      movieId: item.movieId,
      movieSlug: item.movieSlug,
      movieTitle: item.movieTitle,
      posterUrl: item.posterUrl,
      thumbUrl: item.thumbUrl,
      episodeId: item.episodeId,
      episodeName: item.episodeName,
      episodeSlug: item.episodeSlug,
      progressPercent: item.progressPercent,
      currentTime: item.currentTime,
      duration: item.duration,
      lastWatchedAt: item.lastWatchedAt,
    }))
    setItems(mapped)
    setLoading(false)

    // 2. Async: merge with server data (if authenticated)
    fetch('/api/v1/watch-history/continue?limit=10')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.items?.length) return
        // Merge: keep server items that aren't already in local
        const localIds = new Set(mapped.map((m) => m.movieId))
        const serverItems: ContinueItem[] = data.items
          .filter((s: any) => !localIds.has(s.movie.id))
          .map((s: any) => ({
            movieId: s.movie.id,
            movieSlug: s.movie.slug,
            movieTitle: s.movie.title,
            posterUrl: s.movie.posterUrl,
            thumbUrl: s.movie.thumbUrl,
            episodeId: s.episode?.id || '',
            episodeName: s.episode?.episodeName || 'Tập Full',
            episodeSlug: s.episode?.episodeSlug,
            progressPercent: s.progress,
            currentTime: s.currentTime,
            duration: s.duration || 0,
            lastWatchedAt: s.lastWatchedAt,
          }))
        if (serverItems.length > 0) {
          setItems((prev) => [...prev, ...serverItems].slice(0, 10))
        }
      })
      .catch(() => {}) // Not critical
  }, [])

  const handleDismiss = (movieId: string) => {
    setDismissed((prev) => new Set([...prev, movieId]))
  }

  const visibleItems = items.filter((item) => !dismissed.has(item.movieId))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      </div>
    )
  }

  if (visibleItems.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">
          Tiếp tục xem
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleItems.map((item) => {
          const watchUrl = item.episodeSlug
            ? `/watch/${item.movieSlug}?ep=${item.episodeSlug}`
            : `/watch/${item.movieSlug}`

          return (
            <div key={item.movieId} className="group relative">
              <Link href={watchUrl} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5 border border-white/[0.06]">
                  {(item.posterUrl || item.thumbUrl) ? (
                    <FallbackImage
                      src={item.posterUrl || item.thumbUrl || ''}
                      alt={item.movieTitle}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-8 w-8 text-white/20" />
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 shadow-lg">
                      <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-xs font-semibold text-white/90 line-clamp-1 group-hover:text-primary transition-colors">
                    {item.movieTitle}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <span>{item.episodeName}</span>
                    <span>·</span>
                    <span>{formatTime(item.currentTime)} / {formatTime(item.duration)}</span>
                  </div>
                </div>
              </Link>

              {/* Dismiss button */}
              <button
                onClick={(e) => { e.preventDefault(); handleDismiss(item.movieId) }}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-black/80 hover:text-white z-10"
                title="Xóa khỏi danh sách"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
