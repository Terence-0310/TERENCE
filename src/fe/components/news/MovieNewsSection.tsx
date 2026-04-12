'use client'

// ============================================
// MovieNewsSection — Entertainment news feed (optimized)
// ============================================
// Shows top entertainment news on homepage.
// Uses shared format helpers, image onError fallback.

import { useMovieNews } from '@/src/fe/features/news/hooks/useMovieNews'
import { formatRelativeDate } from '@/src/be/modules/news/format'
import { ExternalLink, Newspaper } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'

export function MovieNewsSection() {
  const { items, loading, error } = useMovieNews({ type: 'top', limit: 10 })

  if (loading) {
    return (
      <section className="px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              Tin tức điện ảnh
            </h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-72 flex-shrink-0 rounded-2xl border border-white/[0.06] bg-card/30 overflow-hidden">
                <div className="aspect-[16/10] skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 rounded skeleton" />
                  <div className="h-4 w-full rounded skeleton" />
                  <div className="h-3 w-2/3 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Tin tức điện ảnh
          </h2>
          <Link
            href="/news"
            className="text-xs font-medium text-primary/70 hover:text-primary transition flex items-center gap-1"
          >
            Xem tất cả
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory">
          {items.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Card sub-component ──

function NewsCard({ article }: { article: { id: string; title: string; description?: string; url: string; image?: string; sourceName: string; publishedAt: string } }) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  const showImage = article.image && !imgError

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-72 flex-shrink-0 snap-start"
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/30 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/[0.12] group-hover:shadow-xl group-hover:shadow-black/40">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-card">
          {showImage ? (
            <img
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <Newspaper className="h-8 w-8 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Source badge */}
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/60 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-sm truncate max-w-[120px]">
            {article.sourceName}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[10px] text-white/40 mb-1.5">
            {formatRelativeDate(article.publishedAt)}
          </p>
          <h3 className="text-sm font-bold text-white/90 leading-snug line-clamp-2 group-hover:text-white transition">
            {article.title}
          </h3>
          {article.description && (
            <p className="mt-1.5 text-xs text-white/50 leading-relaxed line-clamp-2">
              {article.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}
