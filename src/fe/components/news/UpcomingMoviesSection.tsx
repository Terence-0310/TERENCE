'use client'

// ============================================
// UpcomingMoviesSection — Upcoming movies feed (optimized)
// ============================================
// Uses shared format helpers. Image onError fallback.
// Removed unused TrendingUp import.

import { useUpcomingMovies } from '@/src/fe/features/movies/hooks/useUpcomingMovies'
import { formatReleaseDate } from '@/src/be/modules/news/format'
import { Calendar, Star } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'

export function UpcomingMoviesSection() {
  const { items, loading } = useUpcomingMovies({ region: 'VN' })

  if (loading) {
    return (
      <section className="px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Sắp ra rạp
            </h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-40 flex-shrink-0">
                <div className="aspect-[2/3] rounded-xl skeleton" />
                <div className="mt-2 space-y-1">
                  <div className="h-3.5 w-full rounded skeleton" />
                  <div className="h-3 w-2/3 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Phim sắp ra rạp
          </h2>
          <Link
            href="/browse?category=upcoming"
            className="text-xs font-medium text-primary/70 hover:text-primary transition"
          >
            Xem thêm →
          </Link>
        </div>

        {/* Horizontal scroll — poster cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory">
          {items.map((movie) => (
            <UpcomingCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Card sub-component ──

function UpcomingCard({ movie }: { movie: { id: string; tmdbId: number; title: string; poster?: string; backdrop?: string; releaseDate?: string; voteAverage?: number } }) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  // Smart image: poster → backdrop → none
  const imageUrl = !imgError ? (movie.poster ?? movie.backdrop) : null

  return (
    <Link
      href={`/movie/${movie.tmdbId}`}
      className="group w-40 flex-shrink-0 snap-start"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.06] bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/[0.12] group-hover:shadow-xl group-hover:shadow-primary/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card text-white/10">
            <Calendar className="h-10 w-10" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Release date badge */}
        {movie.releaseDate && (
          <div className="absolute bottom-2 left-2 right-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/70 border border-white/10 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
              <Calendar className="h-2.5 w-2.5 text-primary" />
              {formatReleaseDate(movie.releaseDate)}
            </span>
          </div>
        )}

        {/* Rating badge */}
        {movie.voteAverage !== undefined && movie.voteAverage > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-black/70 border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
              <Star className="h-2.5 w-2.5 fill-yellow-400" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <h3 className="text-xs font-semibold text-white/80 leading-snug line-clamp-2 group-hover:text-white transition">
          {movie.title}
        </h3>
        {movie.releaseDate && (
          <p className="mt-0.5 text-[10px] text-white/30">
            {formatReleaseDate(movie.releaseDate)}
          </p>
        )}
      </div>
    </Link>
  )
}
