'use client'

// ============================================
// NewsHero — Banner/header for /news page
// ============================================

import { Newspaper, Clapperboard, Play, Star } from 'lucide-react'

interface NewsHeroProps {
  /** Featured upcoming movie backdrop for dynamic banner */
  featuredBackdrop?: string
}

export function NewsHero({ featuredBackdrop }: NewsHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.04]">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
      {featuredBackdrop ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] transition-opacity duration-1000"
          style={{ backgroundImage: `url(${featuredBackdrop})` }}
        />
      ) : (
        <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-primary/30 via-transparent to-primary/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-10 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Left: Title */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-semibold text-primary uppercase tracking-wider mb-4">
              <Newspaper className="h-3.5 w-3.5" />
              Tin tức điện ảnh
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
              Tin tức phim
            </h1>
            <p className="text-sm md:text-base text-white/50 leading-relaxed">
              Cập nhật trailer mới, review phim, lịch chiếu và tin nóng điện ảnh hàng ngày.
            </p>
          </div>

          {/* Right: Quick stats badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2 text-[11px] text-white/50">
              <Clapperboard className="h-3.5 w-3.5 text-primary/60" />
              Trailer
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2 text-[11px] text-white/50">
              <Star className="h-3.5 w-3.5 text-yellow-500/60" />
              Review
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2 text-[11px] text-white/50">
              <Play className="h-3.5 w-3.5 text-emerald-500/60" />
              Sắp chiếu
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
