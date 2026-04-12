'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import type { Movie } from '@/types/movie'

interface PhimHayRowProps {
  movies: Movie[]
}

export function PhimHayRow({ movies }: PhimHayRowProps) {
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

  if (!movies || movies.length === 0) return null

  return (
    <section className="group/row relative py-2 mb-2">
      <div className="mx-0 md:mx-5 lg:mx-8">
        <div className="flex items-center px-5 md:px-8 mb-4">
          <h2 className="text-xl font-black leading-tight tracking-tight text-white uppercase flex items-center gap-2">
            Phim
            <span className="text-primary italic">hay</span>
          </h2>
        </div>

        <div className="relative">
          {/* Scroll Arrows */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-16 w-12 items-center justify-center
                bg-gradient-to-r from-background via-background/80 to-transparent"
            >
              <div className="rounded-full bg-white/10 p-2 backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-all">
                <ChevronLeft className="h-6 w-6 text-white" />
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-4 md:gap-5 overflow-x-auto px-5 md:px-8 pb-4 pt-2 scrollbar-hide snap-x snap-mandatory"
          >
            {movies.map((movie, i) => (
              <Link
                key={movie.id}
                href={movie.mediaType === 'tv' ? `/tv/${movie.id}` : `/watch/${movie.id}`}
                className="group relative w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px] flex-shrink-0 animate-card-reveal snap-start focus-ring"
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem] border border-white/5 bg-card transition-all duration-300 group-hover:-translate-y-2 group-hover:border-[2.5px] group-hover:border-primary group-hover:shadow-[0_0_25px_rgba(45,212,191,0.6)]">
                  <Image
                    src={movie.posterUrl || '/placeholder.jpg'}
                    alt={movie.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 130px, (max-width: 768px) 150px, (max-width: 1024px) 170px, 190px"
                  />
                  
                  {/* Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Title inside card */}
                  <div className="absolute inset-x-0 bottom-6 p-4 flex flex-col justify-end items-center text-center">
                    <h3 className="text-sm md:text-base font-black text-white/95 uppercase tracking-wide drop-shadow-md leading-tight transition-colors line-clamp-3">
                      {movie.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-16 w-12 items-center justify-center
                bg-gradient-to-l from-background via-background/80 to-transparent"
            >
              <div className="rounded-full bg-white/10 p-2 backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-all">
                <ChevronRight className="h-6 w-6 text-white" />
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
