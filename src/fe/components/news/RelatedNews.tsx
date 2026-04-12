'use client'

// ============================================
// RelatedNews — Related news for movie detail (optimized)
// ============================================
// Now passes originalTitle + year for richer context.
// Image onError fallback. Shared format helpers.

import { useMovieNews } from '@/src/fe/features/news/hooks/useMovieNews'
import { formatRelativeDate } from '@/src/be/modules/news/format'
import { ExternalLink, Newspaper } from 'lucide-react'
import { useState, useCallback } from 'react'

interface RelatedNewsProps {
  /** Movie title to search for */
  movieTitle: string
  /** Original title for English search */
  originalTitle?: string
  /** Release year for context */
  year?: number
  /** Max items to show */
  limit?: number
}

export function RelatedNews({ movieTitle, originalTitle, year, limit = 6 }: RelatedNewsProps) {
  // Use original title for query if different (better GNews results in English)
  const searchQuery = originalTitle && originalTitle !== movieTitle
    ? originalTitle
    : movieTitle

  const { items, loading, error } = useMovieNews({
    type: 'related',
    query: searchQuery,
    originalTitle: originalTitle !== movieTitle ? originalTitle : undefined,
    year,
    limit,
    enabled: !!searchQuery,
  })

  // Loading skeleton
  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
        <h2 className="mb-5 text-lg font-bold text-white flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Tin tức liên quan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-card/30 overflow-hidden">
              <div className="aspect-[2/1] skeleton" />
              <div className="p-3 space-y-1.5">
                <div className="h-3 w-16 rounded skeleton" />
                <div className="h-4 w-full rounded skeleton" />
                <div className="h-3 w-3/4 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Don't render if no articles found (graceful empty state)
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 lg:px-10">
      <h2 className="mb-5 text-lg font-bold text-white flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary" />
        Tin tức liên quan
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((article) => (
          <RelatedNewsCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

// ── Card sub-component ──

function RelatedNewsCard({ article }: { article: { id: string; title: string; description?: string; url: string; image?: string; sourceName: string; publishedAt: string } }) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  const showImage = article.image && !imgError

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-white/[0.06] bg-card/30 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.10] hover:shadow-lg hover:shadow-black/30"
    >
      {/* Image */}
      <div className="relative aspect-[2/1] overflow-hidden bg-card">
        {showImage ? (
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Newspaper className="h-6 w-6 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-primary/60 font-medium truncate max-w-[100px]">
            {article.sourceName}
          </span>
          <span className="text-[9px] text-white/20">•</span>
          <span className="text-[10px] text-white/30">
            {formatRelativeDate(article.publishedAt)}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white/85 leading-snug line-clamp-2 group-hover:text-white transition">
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-1 text-[11px] text-white/40 line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary/60 group-hover:text-primary transition">
          Đọc thêm
          <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </div>
    </a>
  )
}
