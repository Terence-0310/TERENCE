import Image from 'next/image'
import Link from 'next/link'
import { Star, Play } from 'lucide-react'
import type { Movie } from '@/types/movie'

interface MovieCardProps {
  movie: Movie
  priority?: boolean
  showRank?: number
  /** Show landscape (16:9) instead of portrait (2:3) */
  landscape?: boolean
}

export function MovieCard({ movie, priority = false, showRank, landscape = false }: MovieCardProps) {
  // Determine image source: landscape prefers backdrop, portrait prefers poster
  const imageUrl = landscape
    ? (movie.backdropUrl || movie.posterUrl || '/placeholder.jpg')
    : (movie.posterUrl || '/placeholder.jpg')

  const aspectClass = landscape ? 'aspect-video' : 'aspect-[2/3]'
  const hoverClass = landscape ? 'card-neon-hover' : 'card-hover'

  return (
    <Link href={`/movie/${movie.id}`} className="group relative block flex-shrink-0 focus-ring rounded-xl">
      <div className={`relative ${aspectClass} w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card transition-all duration-300 ${hoverClass} group-hover:border-primary/20`}>
        {/* Image */}
        <Image
          src={imageUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes={landscape
            ? '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw'
            : '(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw'
          }
          priority={priority}
        />

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Rating badge — top-right */}
        {!landscape && movie.voteAverage > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-yellow-400 backdrop-blur-sm border border-yellow-500/10">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.voteAverage}
          </div>
        )}

        {/* Landscape: Episode/status badges — bottom-left */}
        {landscape && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            {movie.voteAverage > 0 && (
              <span className="rounded bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-white flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {movie.voteAverage}
              </span>
            )}
          </div>
        )}

        {/* Rank number */}
        {showRank && (
          <div className="absolute -left-1 bottom-2 flex h-10 w-10 items-center justify-center">
            <span className="text-4xl font-black text-white/20 drop-shadow-lg" style={{ WebkitTextStroke: '1px rgba(45,212,191,0.3)' }}>
              {showRank}
            </span>
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="mb-auto mt-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-white shadow-xl shadow-primary/30 transition-transform duration-300 group-hover:scale-100 scale-75">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
          {!landscape && (
            <div className="mt-3 w-full text-center">
              <p className="text-[11px] font-medium text-white/60">
                {movie.year > 0 ? movie.year : ''}
                {movie.runtimeFormatted ? ` · ${movie.runtimeFormatted}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-2.5 px-0.5">
        <h3 className="line-clamp-1 text-[13px] font-bold text-white/90 transition-colors group-hover:text-primary">
          {movie.title}
        </h3>
        {landscape && movie.originalTitle && movie.originalTitle !== movie.title ? (
          <p className="mt-0.5 text-[11px] text-white/40 line-clamp-1">{movie.originalTitle}</p>
        ) : (
          movie.year > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{movie.year}</p>
          )
        )}
      </div>
    </Link>
  )
}

export function MovieCardSkeleton({ landscape = false }: { landscape?: boolean }) {
  return (
    <div className="flex-shrink-0">
      <div className={`${landscape ? 'aspect-video' : 'aspect-[2/3]'} w-full rounded-xl skeleton`} />
      <div className="mt-2.5 px-0.5 space-y-1.5">
        <div className="h-3.5 w-4/5 rounded skeleton" />
        <div className="h-3 w-2/5 rounded skeleton" />
      </div>
    </div>
  )
}
