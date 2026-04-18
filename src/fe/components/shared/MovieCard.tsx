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
  const rawImageUrl = landscape
    ? (movie.backdropUrl || movie.posterUrl || '/placeholder.jpg')
    : (movie.posterUrl || '/placeholder.jpg')

  // Proxy the image if it's from TMDB to avoid 404s/slow loads due to network blocks
  const isTmdbImage = rawImageUrl.includes('tmdb.org') || rawImageUrl.includes('themoviedb.org')
  const imageUrl = isTmdbImage 
    ? `/api/tmdb-image/${movie.id}?url=${encodeURIComponent(rawImageUrl)}&isTv=${movie.mediaType === 'tv'}`
    : rawImageUrl

  const aspectClass = landscape ? 'aspect-video' : 'aspect-[2/3]'
  const hoverClass = landscape ? 'card-neon-hover' : 'card-hover'

  const href = (movie as any).customUrl || (movie.mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`)

  return (
    <Link href={href} className={`group relative block flex-shrink-0 focus-ring hover:z-50 ${landscape ? 'rounded-xl' : 'rounded-[2.5rem] md:rounded-[3rem]'}`}>
      <div className={`relative ${aspectClass} w-full overflow-hidden ${landscape ? 'rounded-xl border border-white/[0.06] bg-card transition-all duration-300 group-hover:border-primary/20' : 'rounded-[2.5rem] md:rounded-[3rem] border border-white/5 bg-card transition-all duration-300 group-hover:-translate-y-2 group-hover:border-[2.5px] group-hover:border-primary group-hover:shadow-[0_0_25px_rgba(45,212,191,0.6)]'}`}>
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
          unoptimized={imageUrl.startsWith('/api') || imageUrl.includes('tmdb.org') || imageUrl.includes('themoviedb.org')}
        />

        {/* Hover gradient or Vignette */}
        <div className={`absolute inset-0 bg-gradient-to-t ${landscape ? 'from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100' : 'from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100'} transition-opacity duration-300`} />

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

        {/* Rank number inside card for landscape only */}
        {showRank && landscape && (
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

        {/* Sync PhimHay: Title inside card for portrait without Rank */}
        {!landscape && !showRank && (
          <div className="absolute inset-x-0 bottom-6 p-4 flex flex-col justify-end items-center text-center z-10 pointer-events-none">
            <h3 className="text-sm md:text-base font-black text-white/95 uppercase tracking-wide drop-shadow-md leading-tight transition-colors line-clamp-3">
              {movie.title}
            </h3>
          </div>
        )}
      </div>

      {/* Rophim style Top Rank numbers and Title BELOW the card (Portrait with Rank) */}
      {!landscape && showRank && (
        <div className="mt-3 flex items-start gap-3 px-1 md:px-2">
          <div className="font-black italic text-[#FFC107] text-[36px] min-w-[28px] leading-[0.85] tracking-tighter drop-shadow-md">
            {showRank}
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden pt-1">
            <h3 className="text-[12px] font-bold text-white/95 line-clamp-1 group-hover:text-primary transition-colors">
              {movie.title}
            </h3>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-[10px] text-white/50 line-clamp-1">{movie.originalTitle}</p>
            )}
            <p className="text-[10px] text-white/70 mt-1">
              {movie.mediaType === 'tv' ? 'Phần 1 • Tập 1' : 'Tập FULL'}
            </p>
          </div>
        </div>
      )}

      {/* Title below card (Only for Landscape now) */}
      {landscape && (
        <div className="mt-2.5 px-0.5">
          <h3 className="line-clamp-1 text-[13px] font-bold text-white/90 transition-colors group-hover:text-primary">
            {movie.title}
          </h3>
          {movie.originalTitle && movie.originalTitle !== movie.title ? (
            <p className="mt-0.5 text-[11px] text-white/40 line-clamp-1">{movie.originalTitle}</p>
          ) : (
            movie.year > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{movie.year}</p>
            )
          )}
        </div>
      )}

      {/* Rophim Netflix-like Hover Detail Card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[260px] md:w-[320px] 
        bg-[#181824] border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.9)]
        opacity-0 pointer-events-none scale-90 group-hover:scale-100 xl:group-hover:opacity-100 group-hover:pointer-events-auto
        transition-all duration-300 z-50 flex flex-col overflow-hidden origin-bottom
        invisible group-hover:visible delay-300">
        
        {/* Backdrop Header */}
        <div className="relative w-full aspect-video bg-black/50">
          <Image
            src={movie.backdropUrl && movie.backdropUrl !== '/placeholder.jpg' ? (movie.backdropUrl.includes('tmdb.org') ? `/api/tmdb-image/${movie.id}?url=${encodeURIComponent(movie.backdropUrl)}&isTv=${movie.mediaType === 'tv'}` : movie.backdropUrl) : imageUrl}
            alt={movie.title}
            fill
            className="object-cover"
            unoptimized={true}
          />
          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181824] via-transparent to-transparent opacity-90" />
        </div>

        {/* Content Body */}
        <div className="p-3 md:p-4 flex flex-col gap-3 -mt-4 relative z-10">
          <div>
            <h3 className="font-bold text-white text-[15px] md:text-[17px] leading-tight line-clamp-1">{movie.title}</h3>
            {movie.originalTitle && <p className="text-[11px] md:text-xs text-white/50 line-clamp-1 mt-0.5">{movie.originalTitle}</p>}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-[#FFC107] hover:bg-[#e0a800] text-black text-[12px] md:text-[13px] font-bold py-2 rounded-[6px] flex items-center justify-center gap-1.5 transition">
              <Play className="w-3.5 h-3.5 fill-black" /> Xem ngay
            </div>
            <div className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-[6px] py-2 transition text-[12px] md:text-[13px] flex items-center gap-1.5 font-medium">
               Thích
            </div>
            <div className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-[6px] py-2 transition text-[12px] md:text-[13px] flex items-center gap-1.5 font-medium">
               Chi tiết
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2.5 text-[11px] md:text-xs text-white/70 font-semibold mt-1">
            {movie.voteAverage > 0 && <span className="border border-white/20 px-1.5 py-[1px] rounded text-[#FFC107] border-[#FFC107]/30 bg-[#FFC107]/10 flex items-center gap-1"><Star className="w-3 h-3 fill-[#FFC107]" /> {movie.voteAverage}</span>}
            {movie.year > 0 && <span>{movie.year}</span>}
            {movie.runtimeFormatted && <span>{movie.runtimeFormatted}</span>}
            <span className="border border-white/20 px-1.5 py-[1px] rounded text-white/60 uppercase">{movie.mediaType === 'tv' ? 'Phim Bộ' : 'Phim Lẻ'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function MovieCardSkeleton({ landscape = false }: { landscape?: boolean }) {
  return (
    <div className="flex-shrink-0">
      <div className={`${landscape ? 'aspect-video rounded-xl' : 'aspect-[2/3] rounded-[2.5rem] md:rounded-[3rem]'} w-full skeleton`} />
      {landscape && (
        <div className="mt-2.5 px-0.5 space-y-1.5">
          <div className="h-3.5 w-4/5 rounded skeleton" />
          <div className="h-3 w-2/5 rounded skeleton" />
        </div>
      )}
    </div>
  )
}
