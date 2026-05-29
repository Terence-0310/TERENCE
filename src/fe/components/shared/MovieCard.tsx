'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Star, Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react'
import type { Movie } from '@/types/movie'

// Some callers attach a customUrl to override the default route (e.g. easter eggs).
type MovieWithOptionalUrl = Movie & { customUrl?: string }

interface MovieCardProps {
  movie: Movie
  priority?: boolean
  showRank?: number
  /** Show landscape (16:9) instead of portrait (2:3) */
  landscape?: boolean
}

export function MovieCard({ movie, priority = false, showRank, landscape = false }: MovieCardProps) {
  const rawImageUrl = landscape
    ? (movie.backdropUrl || movie.posterUrl || '/placeholder.jpg')
    : (movie.posterUrl || '/placeholder.jpg')

  const [imgError, setImgError] = useState(false)
  const imageUrl = imgError ? '/placeholder.jpg' : rawImageUrl

  const aspectClass = landscape ? 'aspect-video' : 'aspect-[2/3]'

  const href = (movie as MovieWithOptionalUrl).customUrl || (movie.mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`)

  return (
    <Link href={href} className={`group relative block flex-shrink-0 focus-ring hover:z-50 ${landscape ? 'rounded-xl' : 'rounded-[2.5rem] md:rounded-[3rem]'}`}>
      {/* Image + popup wrapper — popup centers on this so the rank/title
          block (rendered AFTER this wrapper) never affects its position,
          and `min-h-full` guarantees no card border peeks out below. */}
      <div className="relative w-full">
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
          unoptimized={true}
          onError={() => setImgError(true)}
        />

        {/* Hover gradient or Vignette */}
        <div className={`absolute inset-0 bg-gradient-to-t ${landscape ? 'from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100' : 'from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100'} transition-opacity duration-300`} />

        {/* Rating badge — top-right */}
        {!landscape && movie.voteAverage > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-primary backdrop-blur-sm border border-primary/20">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {movie.voteAverage}
          </div>
        )}

        {/* Landscape: Episode/status badges — bottom-left */}
        {landscape && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            {movie.voteAverage > 0 && (
              <span className="rounded bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-white flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {movie.voteAverage}
              </span>
            )}
          </div>
        )}

        {/* Rank number inside card (landscape) — top-left so it doesn't
            collide with the rating badge at bottom-left */}
        {showRank && landscape && (
          <div className="absolute left-1 top-1 flex h-11 w-11 items-center justify-center pointer-events-none">
            <span
              className="text-[44px] font-black italic leading-none text-white/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              style={{ WebkitTextStroke: '1.5px rgba(45,212,191,0.85)' }}
            >
              {showRank}
            </span>
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="mb-auto mt-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-transform duration-300 group-hover:scale-110 scale-75">
            <Play className="h-5 w-5 text-teal-950 fill-teal-950 ml-0.5" />
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

      {/* Rophim Netflix-like Hover Detail Card — positioned inside the
          image wrapper so it stays centered on the card image only.
          `min-h-full` extends it to fully cover the portrait card so the
          original card border never peeks below when hovered. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] md:w-[340px] min-h-full
        bg-card border border-white/10 group-hover:border-primary/40 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] group-hover:shadow-[0_20px_60px_rgba(45,212,191,0.2)]
        opacity-0 pointer-events-none scale-75 group-hover:scale-100 xl:group-hover:opacity-100 group-hover:pointer-events-auto
        transition-all duration-300 z-[100] flex flex-col overflow-hidden origin-center
        invisible group-hover:visible delay-300">

        {/* Backdrop Header */}
        <div className="relative w-full aspect-video bg-zinc-900">
          <Image
            src={movie.backdropUrl && movie.backdropUrl !== '/placeholder.jpg' ? movie.backdropUrl : imageUrl}
            alt={movie.title}
            fill
            className="object-cover"
            unoptimized={true}
          />
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-2 relative z-10">
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mb-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary hover:bg-[#1fbda9] transition-all shadow-[0_0_15px_rgba(45,212,191,0.4)] hover:scale-110" onClick={(e) => e.preventDefault()}>
              <Play className="h-4 w-4 fill-black text-black ml-0.5" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 hover:border-white/80 hover:bg-white/10 text-white transition-all" onClick={(e) => e.preventDefault()}>
               <Plus className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 hover:border-white/80 hover:bg-white/10 text-white transition-all" onClick={(e) => e.preventDefault()}>
               <ThumbsUp className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <button className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 hover:border-white/80 hover:bg-white/10 text-white transition-all" onClick={(e) => e.preventDefault()}>
               <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-[12px] font-bold text-white/90">
            {movie.voteAverage > 0 && <span className="text-primary flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-primary" /> {movie.voteAverage}</span>}
            {movie.year > 0 && <span>{movie.year}</span>}
            {movie.runtimeFormatted && <span>{movie.runtimeFormatted}</span>}
            <span className="border border-white/30 px-1.5 py-[1px] rounded text-[10px] text-white/70 uppercase leading-none">{movie.mediaType === 'tv' ? 'Phim Bộ' : 'Phim Lẻ'}</span>
          </div>

          <div className="mt-0.5">
            <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-1">{movie.title}</h3>
          </div>

          {movie.genres && movie.genres.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-white/60 font-medium">
               {movie.genres.slice(0, 3).map((g, idx) => (
                 <span key={g.id} className="flex items-center gap-1.5">
                   {g.name}
                   {idx < Math.min(movie.genres.length, 3) - 1 && (
                     <span className="w-1 h-1 rounded-full bg-white/30"></span>
                   )}
                 </span>
               ))}
            </div>
          )}
        </div>
      </div>
      </div>
      {/* /Image + popup wrapper */}

      {/* Rophim style Top Rank numbers and Title BELOW the card (Portrait with Rank) */}
      {!landscape && showRank && (
        <div className="mt-3 flex items-start gap-3 px-1 md:px-2">
          <div className="font-black italic text-primary text-[36px] min-w-[28px] leading-[0.85] tracking-tighter drop-shadow-md">
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
