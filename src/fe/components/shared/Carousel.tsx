'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  children: React.ReactNode
  /** Extra classes for the outer wrapper */
  className?: string
  /** Extra classes for the scrollable flex container (e.g., gap-4) */
  containerClassName?: string
  /** Always show arrows on desktop, or only on hover? (Default: hover) */
  arrowVisibility?: 'hover' | 'always'
  /** Fade edges instead of solid color blocks */
  fadeEdges?: boolean
}

export function Carousel({
  children,
  className = '',
  containerClassName = 'gap-3 md:gap-4',
  arrowVisibility = 'hover',
  fadeEdges = true,
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    // Round to avoid pixel rounding errors blocking the right arrow logic
    setCanScrollRight(Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth - 10)
  }

  // Initial check on mount
  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
    setTimeout(checkScroll, 400)
  }

  const visibilityClass = arrowVisibility === 'hover'
    ? 'opacity-100 md:opacity-0 md:group-hover/slider:opacity-100'
    : 'opacity-100'

  const edgeClassLeft = fadeEdges
    ? 'bg-gradient-to-r from-[var(--surface-elevated)] via-[var(--surface-elevated)]/80 to-transparent'
    : ''
  const edgeClassRight = fadeEdges
    ? 'bg-gradient-to-l from-[var(--surface-elevated)] via-[var(--surface-elevated)]/80 to-transparent'
    : ''

  return (
    <div className={`relative group/slider ${className}`}>
      {canScrollLeft && (
        <button
          onClick={(e) => { e.preventDefault(); scroll('left') }}
          className={`absolute -left-2 md:-left-4 top-0 bottom-0 z-10 w-10 md:w-16 flex items-center justify-start
            pl-1 md:pl-2 transition-opacity duration-300 ${visibilityClass} ${edgeClassLeft}`}
          aria-label="Cuộn trái"
        >
          <div className="rounded-full bg-black/40 md:bg-white/10 p-1.5 md:p-2 backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-colors pointer-events-auto shadow-lg">
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={`flex overflow-x-auto scrollbar-hide scroll-smooth ${containerClassName}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={(e) => { e.preventDefault(); scroll('right') }}
          className={`absolute -right-2 md:-right-4 top-0 bottom-0 z-10 w-10 md:w-16 flex items-center justify-end
            pr-1 md:pr-2 transition-opacity duration-300 ${visibilityClass} ${edgeClassRight}`}
          aria-label="Cuộn phải"
        >
          <div className="rounded-full bg-black/40 md:bg-white/10 p-1.5 md:p-2 backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-colors pointer-events-auto shadow-lg">
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
        </button>
      )}
    </div>
  )
}
