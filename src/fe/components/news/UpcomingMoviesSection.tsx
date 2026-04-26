'use client'

// ============================================
// UpcomingMoviesSection — Upcoming movies (PhimHay-style row)
// ============================================
// Single horizontal scroll row with rounded poster cards,
// matching PhimHayRow visual style for consistency.

import { useUpcomingMovies } from '@/src/fe/features/movies/hooks/useUpcomingMovies'
import { formatReleaseDate } from '@/src/be/modules/news/format'
import { Calendar, Star, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { Carousel } from '@/src/fe/components/shared/Carousel'

export function UpcomingMoviesSection() {
  const { items, loading } = useUpcomingMovies({ region: 'VN' })

  if (loading) {
    return (
      <section className="group/row relative py-2 mb-2">
        <div className="mx-0 md:mx-5 lg:mx-8">
          <div className="flex items-center justify-between px-5 md:px-8 mb-4">
            <h2 className="text-xl font-black leading-tight tracking-tight text-white uppercase flex items-center gap-2">
              Sắp <span className="text-primary italic">ra rạp</span>
            </h2>
          </div>
          <div className="flex gap-4 md:gap-5 px-5 md:px-8 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px] flex-shrink-0">
                <div className="aspect-[2/3] rounded-[2.5rem] md:rounded-[3rem] skeleton" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="group/row relative py-2 mb-2">
      <div className="mx-0 md:mx-5 lg:mx-8">
        {/* Header — same style as PhimHayRow */}
        <div className="flex items-center justify-between px-5 md:px-8 mb-4">
          <h2 className="text-xl font-black leading-tight tracking-tight text-white uppercase flex items-center gap-2">
            Sắp <span className="text-primary italic">ra rạp</span>
          </h2>
          <Link
            href="/browse?category=upcoming"
            className="text-xs font-semibold text-white/40 hover:text-primary transition flex items-center gap-1 group"
          >
            Xem toàn bộ
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Scrollable row using shared Carousel */}
        <Carousel
          containerClassName="flex gap-4 md:gap-5 overflow-x-auto px-5 md:px-8 pb-4 pt-2 snap-x snap-mandatory disabled-scrollbar"
          arrowVisibility="hover"
        >
          {items.map((movie, i) => (
            <UpcomingCard key={movie.id} movie={movie} index={i} />
          ))}
        </Carousel>
      </div>
    </section>
  )
}

// ── Card sub-component (PhimHay-style poster) ──

function UpcomingCard({ movie, index }: {
  movie: { id: string; tmdbId: number; title: string; poster?: string; backdrop?: string; releaseDate?: string; voteAverage?: number }
  index: number
}) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  const imageUrl = !imgError ? (movie.poster ?? movie.backdrop) : null

  return (
    <Link
      href={`/movie/${movie.tmdbId}`}
      className="group relative w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px] flex-shrink-0 animate-card-reveal snap-start focus-ring"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem] border border-white/5 bg-card transition-all duration-300 group-hover:-translate-y-2 group-hover:border-[2.5px] group-hover:border-primary group-hover:shadow-[0_0_25px_rgba(45,212,191,0.6)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card text-white/10">
            <Calendar className="h-10 w-10" />
          </div>
        )}

        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Rating badge (top-right) */}
        {movie.voteAverage !== undefined && movie.voteAverage > 0 && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-black/60 border border-white/10 px-2 py-0.5 text-[11px] font-bold text-yellow-400 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        )}

        {/* Release date badge (top-left) */}
        {movie.releaseDate && (
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-sm">
              <Calendar className="h-2.5 w-2.5" />
              {formatReleaseDate(movie.releaseDate)}
            </span>
          </div>
        )}

        {/* Title inside card (bottom) */}
        <div className="absolute inset-x-0 bottom-6 p-4 flex flex-col justify-end items-center text-center">
          <h3 className="text-sm md:text-base font-black text-white/95 uppercase tracking-wide drop-shadow-md leading-tight transition-colors line-clamp-3">
            {movie.title}
          </h3>
        </div>
      </div>
    </Link>
  )
}
