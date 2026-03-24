'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { Movie } from '@/types/movie'

interface HeroBannerProps {
  movies: Movie[]
}

export function HeroBanner({ movies }: HeroBannerProps) {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const items = movies.slice(0, 6)

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return
      setIsTransitioning(true)
      setCurrent(index)
      setTimeout(() => setIsTransitioning(false), 700)
    },
    [isTransitioning],
  )

  const next = useCallback(() => goTo((current + 1) % items.length), [current, items.length, goTo])
  const prev = useCallback(() => goTo((current - 1 + items.length) % items.length), [current, items.length, goTo])

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(next, 7000)
    return () => clearInterval(timer)
  }, [next, items.length])

  if (items.length === 0) return null
  const movie = items[current]

  return (
    <section className="relative h-[75vh] min-h-[550px] max-h-[850px] w-full overflow-hidden">
      {/* Backdrop Images — crossfade */}
      {items.map((m, i) => (
        <div
          key={m.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          {m.backdropUrl && m.backdropUrl !== '/placeholder.jpg' && (
            <Image
              src={m.backdropUrl}
              alt={m.title}
              fill
              className="object-cover object-top"
              priority={i < 2}
              sizes="100vw"
            />
          )}
        </div>
      ))}

      {/* Cinematic Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      <div className="absolute bottom-0 h-32 w-full bg-gradient-to-t from-background to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-24 md:items-center md:pb-0">
        <div className="mx-auto w-full max-w-7xl px-5 md:px-8 lg:px-10">
          <div className="max-w-xl space-y-5 animate-hero-in" key={movie.id}>
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/25">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Trending
              </span>
              {movie.voteAverage > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/15 px-2.5 py-1 text-xs font-bold text-yellow-400 border border-yellow-500/20">
                  <Star className="h-3 w-3 fill-yellow-400" />
                  {movie.voteAverage}
                </span>
              )}
              {movie.year > 0 && (
                <span className="rounded-md bg-white/8 px-2.5 py-1 text-xs font-medium text-white/70 border border-white/5">
                  {movie.year}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
              {movie.title}
            </h1>

            {/* Overview */}
            <p className="line-clamp-2 text-sm leading-relaxed text-white/60 md:text-base md:line-clamp-3">
              {movie.overview || 'Khám phá bộ phim hấp dẫn này trên Terence.'}
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href={`/watch/${movie.id}`}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white transition-transform group-hover:scale-110" />
                Xem ngay
              </Link>
              <Link
                href={`/movie/${movie.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-6 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-md border border-white/10 transition-all hover:bg-white/15 hover:border-white/20"
              >
                <Info className="h-4 w-4" />
                Chi tiết
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/60 backdrop-blur-md border border-white/5 transition-all hover:bg-black/50 hover:text-white hover:scale-110 md:left-5 md:p-3"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/60 backdrop-blur-md border border-white/5 transition-all hover:bg-black/50 hover:text-white hover:scale-110 md:right-5 md:p-3"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Progress dots */}
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-500 ${
                  i === current
                    ? 'h-2 w-10 bg-primary shadow-lg shadow-primary/40'
                    : 'h-2 w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
