'use client'

import { ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState, useMemo } from 'react'
import type { Movie } from '@/types/movie'
import { MovieCard, MovieCardSkeleton } from '@/components/shared/MovieCard'

interface MovieRowProps {
  title: string
  /** Optional accent word in title — shown in italic + primary color */
  accent?: string
  movies: Movie[]
  href?: string
  loading?: boolean
  showRank?: boolean
  /** Force landscape cards (default: true for RoPhim-style) */
  landscape?: boolean
}

export function MovieRow({ title, accent, movies, href, loading, showRank, landscape = true }: MovieRowProps) {
  const [page, setPage] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Desktop grid pagination (3 items per page)
  const GRID_SIZE = 3
  const totalPages = Math.ceil(movies.length / GRID_SIZE)
  const gridMovies = useMemo(
    () => movies.slice(page * GRID_SIZE, (page + 1) * GRID_SIZE),
    [movies, page],
  )

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

  // Parse title: split accent word for italic + primary styling
  const titleParts = accent
    ? title.split(new RegExp(`(${accent})`, 'i'))
    : [title]

  return (
    <section className="group/row relative">
      {/* RoPhim-style elevated background */}
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        <div className="flex items-start gap-8">
          {/* Left: Title + "Xem toàn bộ" link */}
          <div className="hidden md:flex flex-col gap-3 min-w-[140px] shrink-0 pt-2">
            <h2 className="text-xl font-black leading-tight tracking-tight text-white">
              {titleParts.map((part, idx) =>
                accent && part.toLowerCase() === accent.toLowerCase() ? (
                  <span key={idx} className="text-primary italic">{part}</span>
                ) : (
                  <span key={idx}>{part}</span>
                ),
              )}
            </h2>
            {href && (
              <Link
                href={href}
                className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white"
              >
                Xem toàn bộ
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Mobile: Title row (visible on small screens) */}
          <div className="flex items-center justify-between w-full md:hidden mb-3">
            <h2 className="text-lg font-bold tracking-tight text-white">
              {titleParts.map((part, idx) =>
                accent && part.toLowerCase() === accent.toLowerCase() ? (
                  <span key={idx} className="text-primary italic">{part}</span>
                ) : (
                  <span key={idx}>{part}</span>
                ),
              )}
            </h2>
            {href && (
              <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-primary/80 uppercase tracking-wider transition hover:text-primary">
                Xem tất cả
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Right: Cards area */}
          <div className="flex-1 min-w-0">
            {/* Desktop Grid View (3 columns, paginated) */}
            <div className="hidden md:block relative">
              <div className="grid grid-cols-3 gap-4">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i}>
                        <MovieCardSkeleton landscape={landscape} />
                      </div>
                    ))
                  : gridMovies.map((movie, i) => (
                      <div key={movie.id} className="animate-card-reveal" style={{ '--i': i } as React.CSSProperties}>
                        <MovieCard
                          movie={movie}
                          priority={page === 0 && i < 3}
                          showRank={showRank ? page * GRID_SIZE + i + 1 : undefined}
                          landscape={landscape}
                        />
                      </div>
                    ))}
              </div>

              {/* Grid navigation arrow — right */}
              {totalPages > 1 && page < totalPages - 1 && (
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  className="absolute -right-4 top-1/3 z-10 flex h-10 w-10 items-center justify-center
                    rounded-full bg-white/10 border border-white/10 backdrop-blur-sm
                    transition-all carousel-arrow hover:bg-white/20"
                  aria-label="Trang tiếp"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              )}

              {/* Grid navigation arrow — left */}
              {page > 0 && (
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  className="absolute -left-4 top-1/3 z-10 flex h-10 w-10 items-center justify-center
                    rounded-full bg-white/10 border border-white/10 backdrop-blur-sm
                    transition-all carousel-arrow hover:bg-white/20"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            {/* Mobile Horizontal Scroll (unchanged behavior) */}
            <div className="md:hidden relative">
              {canScrollLeft && (
                <button
                  onClick={() => scroll('left')}
                  className="absolute -left-1 top-0 z-10 h-[calc(100%-2rem)] w-10 flex items-center justify-start
                    bg-gradient-to-r from-[var(--surface-elevated)] via-[var(--surface-elevated)]/80 to-transparent pl-1"
                >
                  <div className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm border border-white/5">
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </div>
                </button>
              )}

              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              >
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-[260px] flex-shrink-0">
                        <MovieCardSkeleton landscape={landscape} />
                      </div>
                    ))
                  : movies.map((movie, i) => (
                      <div
                        key={movie.id}
                        className="w-[260px] flex-shrink-0 animate-card-reveal"
                        style={{ '--i': i } as React.CSSProperties}
                      >
                        <MovieCard
                          movie={movie}
                          priority={i < 3}
                          showRank={showRank ? i + 1 : undefined}
                          landscape={landscape}
                        />
                      </div>
                    ))}
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scroll('right')}
                  className="absolute -right-1 top-0 z-10 h-[calc(100%-2rem)] w-10 flex items-center justify-end
                    bg-gradient-to-l from-[var(--surface-elevated)] via-[var(--surface-elevated)]/80 to-transparent pr-1"
                >
                  <div className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm border border-white/5">
                    <ChevronRight className="h-4 w-4 text-white" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
