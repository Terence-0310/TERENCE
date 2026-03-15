import Image from 'next/image'
import Link from 'next/link'
import { Star, Play } from 'lucide-react'
import type { Movie } from '@/types/movie'

interface MovieCardProps {
  movie: Movie
  priority?: boolean
  showRank?: number
}

export function MovieCard({ movie, priority = false, showRank }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="group relative block flex-shrink-0 focus-ring rounded-xl">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card transition-all duration-300 card-hover group-hover:border-primary/20">
        {/* Poster */}
        <Image
          src={movie.posterUrl || '/placeholder.jpg'}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
          priority={priority}
        />

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Rating badge */}
        {movie.voteAverage > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-yellow-400 backdrop-blur-sm border border-yellow-500/10">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.voteAverage}
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

        {/* Play button + info on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="mb-auto mt-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-white shadow-xl shadow-primary/30 transition-transform duration-300 group-hover:scale-100 scale-75">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
          <div className="mt-3 w-full text-center">
            <p className="text-[11px] font-medium text-white/60">
              {movie.year > 0 ? movie.year : ''}
              {movie.runtimeFormatted ? ` · ${movie.runtimeFormatted}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-2.5 px-0.5">
        <h3 className="line-clamp-1 text-[13px] font-semibold text-white/90 transition-colors group-hover:text-primary">
          {movie.title}
        </h3>
        {movie.year > 0 && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{movie.year}</p>
        )}
      </div>
    </Link>
  )
}

export function MovieCardSkeleton() {
  return (
    <div className="flex-shrink-0">
      <div className="aspect-[2/3] w-full rounded-xl skeleton" />
      <div className="mt-2.5 px-0.5 space-y-1.5">
        <div className="h-3.5 w-4/5 rounded skeleton" />
        <div className="h-3 w-2/5 rounded skeleton" />
      </div>
    </div>
  )
}
