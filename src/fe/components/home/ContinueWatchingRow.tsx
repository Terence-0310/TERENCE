'use client'

// ============================================
// ContinueWatchingRow — client component for "Xem tiếp" section
// ============================================
// Renders a horizontal scrollable row of continue watching cards.
// Data comes from localStorage via useContinueWatching hook.
// Renders as a client component because it depends on localStorage.

import { useContinueWatching } from '@/src/fe/features/movies/hooks/useContinueWatching'
import { Play, X, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatTime } from '@/lib/player/time-format'
import { Carousel } from '@/src/fe/components/shared/Carousel'

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

export function ContinueWatchingRow() {
  const { items, removeEpisode } = useContinueWatching({ limit: 10 })

  // Don't render anything if no items — avoids empty section
  if (items.length === 0) return null

  return (
    <section className="group/row relative space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 md:px-8 lg:px-10">
        <h2 className="text-lg font-bold tracking-tight text-white md:text-xl flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Xem tiếp
        </h2>
      </div>

      {/* Scrollable Row */}
      <Carousel
        containerClassName="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory md:gap-4 md:px-8 lg:px-10"
        arrowVisibility="hover"
      >
        {items.map((item, i) => {
          // Build resume URL
          const watchUrl = `/watch/${item.movieSlug}${item.episodeSlug ? `?ep=${item.episodeSlug}` : ''}`
          const imageUrl = item.posterUrl || item.thumbUrl || '/placeholder.jpg'
          const remaining = item.duration > 0
            ? formatTime(item.duration - item.currentTime)
            : null

          return (
            <div
              key={`${item.movieId}:${item.episodeId}`}
              className="group relative w-[200px] flex-shrink-0 snap-start sm:w-[220px] md:w-[260px] lg:w-[280px] animate-card-reveal"
              style={{ '--i': i } as React.CSSProperties}
            >
              {/* Card */}
              <Link href={watchUrl} className="block">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 border border-white/5">
                  <FallbackImage
                    src={imageUrl}
                    alt={item.movieTitle}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 200px, (max-width: 768px) 220px, (max-width: 1024px) 260px, 280px"
                  />
                  {/* Darkening overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-transform hover:scale-110">
                      <Play className="h-5 w-5 text-teal-950 fill-teal-950 ml-0.5" />
                    </div>
                  </div>

                  {/* Progress bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-primary rounded-r-full transition-all"
                      style={{ width: `${Math.min(100, item.progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Text info */}
                <div className="mt-2 px-0.5">
                  <h3 className="truncate text-sm font-medium text-white/90">
                    {item.movieTitle}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                    <span className="truncate">{item.episodeName}</span>
                    {remaining && (
                      <>
                        <span className="text-white/20">•</span>
                        <span className="flex items-center gap-0.5 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          Còn {remaining}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  removeEpisode(item.movieId, item.episodeId)
                }}
                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/60 opacity-0 transition-all hover:bg-black/80 hover:text-white group-hover:opacity-100"
                title="Xóa khỏi danh sách xem tiếp"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </Carousel>
    </section>
  )
}
