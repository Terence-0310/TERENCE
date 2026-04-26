'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Movie } from '@/types/movie'
import { MovieCard, MovieCardSkeleton } from '@/src/fe/components/shared/MovieCard'
import { Carousel } from '@/src/fe/components/shared/Carousel'

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
  // Parse title: split accent word for italic + primary styling
  const titleParts = accent
    ? title.split(new RegExp(`(${accent})`, 'i'))
    : [title]

  return (
    <section className="group/row relative">
      {/* RoPhim-style elevated background */}
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        <div className="flex flex-col md:flex-row items-start gap-3 md:gap-8">
          {/* Left: Title + View All link (Unified for Desktop/Mobile) */}
          <div className="flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-3 w-full md:w-auto md:min-w-[140px] shrink-0 pt-2 mb-3 md:mb-0">
            <h2 className="text-lg md:text-xl font-bold md:font-black leading-tight tracking-tight text-white">
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
                className="flex items-center gap-1 text-xs font-semibold md:font-medium text-primary/80 md:text-white/50 uppercase md:normal-case tracking-wider md:tracking-normal transition hover:text-primary md:hover:text-white"
              >
                <span className="md:hidden">Xem tất cả</span>
                <span className="hidden md:inline">Xem toàn bộ</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Right: Cards area (Unified Horizontal Scroll) */}
          <div className="flex-1 w-full min-w-0 relative">
            <Carousel 
              containerClassName="flex gap-4 md:gap-5 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory px-2 md:px-0"
              arrowVisibility="hover"
            >
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`snap-start flex-shrink-0 ${landscape ? 'w-[200px] sm:w-[240px] md:w-[260px] lg:w-[280px]' : 'w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px]'}`}>
                      <MovieCardSkeleton landscape={landscape} />
                    </div>
                  ))
                : movies.map((movie, i) => (
                    <div
                      key={movie.id}
                      className={`snap-start flex-shrink-0 animate-card-reveal ${landscape ? 'w-[200px] sm:w-[240px] md:w-[260px] lg:w-[280px]' : 'w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px]'}`}
                      style={{ '--i': i } as React.CSSProperties}
                    >
                      <MovieCard
                        movie={movie}
                        priority={i < 4}
                        showRank={showRank ? i + 1 : undefined}
                        landscape={landscape}
                      />
                    </div>
                  ))}
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  )
}
