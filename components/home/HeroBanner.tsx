'use client'

// ============================================
// HeroBanner — RoPhim-style cinematic hero
// ============================================
// Full-bleed backdrop, layered overlays, left-aligned content,
// bottom-right thumbnail slider. Navbar blends into the scene.

import Image from 'next/image'
import Link from 'next/link'
import { Play, Heart, Info } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { Movie } from '@/types/movie'

// ── Sub-components ──

function HeroOverlay() {
  return (
    <>
      {/* Base dark overlay — cinematic feel */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Left side heavy gradient — text readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.78) 28%, rgba(2,6,23,0.45) 52%, rgba(2,6,23,0.08) 72%, transparent 100%)',
        }}
      />
      {/* Top subtle darkening — navbar blend */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,6,23,0.5) 0%, transparent 100%)',
        }}
      />
      {/* Bottom fade to background color — seamless transition */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          background:
            'linear-gradient(to top, var(--background) 0%, rgba(2,6,23,0.7) 40%, transparent 100%)',
        }}
      />
      {/* Vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 120px 30px rgba(2,6,23,0.35)',
        }}
      />
    </>
  )
}

function HeroMeta({ movie }: { movie: Movie }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* IMDb rating */}
      {movie.voteAverage > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
          <span className="text-primary">IMDb</span> {movie.voteAverage}
        </span>
      )}
      {/* Year */}
      {movie.year > 0 && (
        <span className="rounded-md border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
          {movie.year}
        </span>
      )}
      {/* Runtime */}
      {movie.runtimeFormatted && (
        <span className="rounded-md border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
          {movie.runtimeFormatted}
        </span>
      )}
    </div>
  )
}

function HeroActions({ movieId }: { movieId: number }) {
  return (
    <div className="flex items-center gap-4 pt-2">
      {/* Play button — largest, most prominent, mint/cyan */}
      <Link
        href={`/watch/${movieId}`}
        className="group relative inline-flex h-[64px] w-[64px] items-center justify-center rounded-full
          bg-primary text-white
          shadow-[0_0_30px_rgba(45,212,191,0.3),0_0_60px_rgba(45,212,191,0.1)]
          transition-all duration-300
          hover:shadow-[0_0_40px_rgba(45,212,191,0.45),0_0_80px_rgba(45,212,191,0.15)]
          hover:scale-110 hover:-translate-y-0.5
          active:scale-95"
        title="Xem ngay"
      >
        <Play className="h-7 w-7 fill-white text-white ml-1" />
      </Link>

      {/* Heart button — glass circle */}
      <button
        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full
          bg-white/[0.08] border border-white/[0.12] backdrop-blur-md
          transition-all duration-300
          hover:bg-white/[0.15] hover:border-white/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
        title="Yêu thích"
      >
        <Heart className="h-5 w-5 text-white/80" />
      </button>

      {/* Info button — glass circle */}
      <Link
        href={`/movie/${movieId}`}
        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full
          bg-white/[0.08] border border-white/[0.12] backdrop-blur-md
          transition-all duration-300
          hover:bg-white/[0.15] hover:border-white/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
        title="Chi tiết phim"
      >
        <Info className="h-5 w-5 text-white/80" />
      </Link>
    </div>
  )
}

function HeroThumbnails({
  items,
  current,
  onSelect,
}: {
  items: Movie[]
  current: number
  onSelect: (i: number) => void
}) {
  if (items.length <= 1) return null

  return (
    <div className="absolute bottom-14 right-6 z-10 hidden items-end gap-2.5 lg:flex xl:right-10 2xl:right-14">
      {/* Frosted backdrop behind thumbnails */}
      <div
        className="absolute -inset-2.5 -z-10 rounded-xl"
        style={{
          background: 'rgba(2,6,23,0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      {items.map((m, i) => {
        const isActive = i === current
        return (
          <button
            key={m.id}
            onClick={() => onSelect(i)}
            className={`relative flex-shrink-0 overflow-hidden rounded-md transition-all duration-300 ${
              isActive
                ? 'h-[64px] w-[114px] border-[2.5px] border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10'
                : 'h-[58px] w-[100px] border border-white/[0.1] opacity-60 hover:opacity-100 hover:border-white/40'
            }`}
          >
            {m.backdropUrl && m.backdropUrl !== '/placeholder.jpg' && (
              <Image
                src={m.backdropUrl}
                alt={m.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100px, 114px"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Main Component ──

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

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(next, 7000)
    return () => clearInterval(timer)
  }, [next, items.length])

  if (items.length === 0) return null
  const movie = items[current]

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(600px, 82vh, 820px)' }}
    >
      {/* ── Full-bleed backdrop images — crossfade ── */}
      {items.map((m, i) => (
        <div
          key={m.id}
          className="absolute inset-0 transition-opacity duration-[800ms] ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          {m.backdropUrl && m.backdropUrl !== '/placeholder.jpg' && (
            <Image
              src={m.backdropUrl}
              alt={m.title}
              fill
              className="object-cover object-center"
              priority={i < 2}
              sizes="100vw"
              quality={85}
            />
          )}
        </div>
      ))}

      {/* ── Cinematic overlays ── */}
      <HeroOverlay />

      {/* ── Left content panel ── */}
      <div className="absolute inset-0 flex items-end pb-32 md:items-center md:pb-0">
        <div className="mx-auto w-full px-6 md:px-10 lg:px-14" style={{ maxWidth: '1440px' }}>
          <div
            className="max-w-[560px] space-y-5 animate-hero-in"
            key={movie.id}
          >
            {/* Title — very large, bold, cinematic */}
            <h1 className="text-[2.2rem] font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-[3.2rem] lg:text-[3.8rem]">
              {movie.title}
            </h1>

            {/* Original title — subtle italic */}
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-sm italic text-primary/60 drop-shadow-md">
                {movie.originalTitle}
              </p>
            )}

            {/* Metadata badges row */}
            <HeroMeta movie={movie} />

            {/* Genre pills */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.slice(0, 5).map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full bg-white/[0.06] border border-white/[0.1] px-3.5 py-1.5
                      text-[11px] font-semibold text-white/65 tracking-wide backdrop-blur-sm
                      transition-colors hover:bg-white/[0.1] hover:text-white/80"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description — max 3 lines with fade */}
            <p className="line-clamp-3 text-[13px] leading-[1.7] text-white/50 md:text-[14px] md:line-clamp-3 max-w-[520px]">
              {movie.overview || 'Khám phá bộ phim hấp dẫn này trên Terence.'}
            </p>

            {/* Action buttons */}
            <HeroActions movieId={movie.id} />
          </div>
        </div>
      </div>

      {/* ── Thumbnail slider — bottom right ── */}
      <HeroThumbnails items={items} current={current} onSelect={goTo} />
    </section>
  )
}
