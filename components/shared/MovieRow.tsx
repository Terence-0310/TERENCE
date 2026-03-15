'use client'

import { ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import type { Movie } from '@/types/movie'
import { MovieCard, MovieCardSkeleton } from '@/components/shared/MovieCard'

interface MovieRowProps {
  title: string
  movies: Movie[]
  href?: string
  loading?: boolean
  showRank?: boolean
}

export function MovieRow({ title, movies, href, loading, showRank }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
    setTimeout(checkScroll, 400)
  }

  return (
    <section className="group/row relative space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 md:px-8 lg:px-10">
        <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-semibold text-primary/80 uppercase tracking-wider transition hover:text-primary"
          >
            Xem tất cả
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Scrollable Row */}
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute -left-1 top-0 z-10 hidden h-[calc(100%-2rem)] w-12 items-center justify-start bg-gradient-to-r from-background via-background/80 to-transparent pl-2 transition-opacity md:flex opacity-0 group-hover/row:opacity-100"
          >
            <div className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm border border-white/5 transition hover:bg-white/20">
              <ChevronLeft className="h-4 w-4 text-white" />
            </div>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide md:gap-4 md:px-8 lg:px-10"
        >
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-[130px] flex-shrink-0 sm:w-[150px] md:w-[170px] lg:w-[190px]">
                  <MovieCardSkeleton />
                </div>
              ))
            : movies.map((movie, i) => (
                <div key={movie.id} className="w-[130px] flex-shrink-0 sm:w-[150px] md:w-[170px] lg:w-[190px]">
                  <MovieCard movie={movie} priority={i < 5} showRank={showRank ? i + 1 : undefined} />
                </div>
              ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute -right-1 top-0 z-10 hidden h-[calc(100%-2rem)] w-12 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent pr-2 transition-opacity md:flex opacity-0 group-hover/row:opacity-100"
          >
            <div className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm border border-white/5 transition hover:bg-white/20">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </button>
        )}
      </div>
    </section>
  )
}
