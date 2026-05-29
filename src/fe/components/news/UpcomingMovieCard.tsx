'use client'

// ============================================
// UpcomingMovieCard — Movie card for upcoming
// ============================================

import { Calendar, Star } from 'lucide-react'
import { formatReleaseDate } from '@/src/be/modules/news/format'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import type { UpcomingMovieItem } from '@/src/be/modules/news/legacy-types'

interface UpcomingMovieCardProps {
  movie: UpcomingMovieItem
}

export function UpcomingMovieCard({ movie }: UpcomingMovieCardProps) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])
  const imageUrl = !imgError ? (movie.poster ?? movie.backdrop) : null

  return (
    <Link href={`/movie/${movie.tmdbId}`} className="group">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-card aspect-[2/3] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/[0.12] group-hover:shadow-xl group-hover:shadow-primary/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Calendar className="h-8 w-8 text-white/10" />
          </div>
        )}

        {movie.releaseDate && (
          <div className="absolute bottom-2 left-2 right-2">
            <span className="inline-flex items-center gap-1 rounded bg-black/70 border border-white/10 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
              <Calendar className="h-2.5 w-2.5 text-primary" />
              {formatReleaseDate(movie.releaseDate)}
            </span>
          </div>
        )}

        {movie.voteAverage !== undefined && movie.voteAverage > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              <Star className="h-2.5 w-2.5 fill-primary" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="text-xs font-semibold text-white/80 line-clamp-2 group-hover:text-white transition">
          {movie.title}
        </h3>
        {movie.overview && (
          <p className="mt-0.5 text-[10px] text-white/30 line-clamp-2">{movie.overview}</p>
        )}
        {movie.releaseDate && (
          <p className="mt-0.5 text-[10px] text-white/25">{formatReleaseDate(movie.releaseDate)}</p>
        )}
      </div>
    </Link>
  )
}

// ── Grid wrapper ──

interface UpcomingMovieGridProps {
  movies: UpcomingMovieItem[]
}

export function UpcomingMovieGrid({ movies }: UpcomingMovieGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.map((movie) => (
        <UpcomingMovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
