'use client'

// ============================================
// NewsArticleCard — Article card for /news
// ============================================

import { ExternalLink, Newspaper } from 'lucide-react'
import { formatRelativeDate } from '@/lib/news/format'
import { useState, useCallback } from 'react'
import type { NewsArticle } from '@/lib/news/types'

interface NewsArticleCardProps {
  article: NewsArticle
  /** Compact mode for smaller grids */
  compact?: boolean
}

export function NewsArticleCard({ article, compact = false }: NewsArticleCardProps) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])
  const showImage = article.image && !imgError

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/30 hover:bg-card/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 flex flex-col"
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${compact ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
        {showImage ? (
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card">
            <Newspaper className="h-10 w-10 text-white/[0.08]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-black/60 border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/70 backdrop-blur-sm truncate max-w-[140px]">
          {article.sourceName}
        </span>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
          <span>{formatRelativeDate(article.publishedAt)}</span>
          {article.author && (
            <>
              <span>•</span>
              <span className="truncate max-w-[120px]">{article.author}</span>
            </>
          )}
        </div>
        <h3 className={`text-white font-bold leading-snug group-hover:text-primary/90 transition ${compact ? 'line-clamp-2 text-sm' : 'line-clamp-2'}`}>
          {article.title}
        </h3>
        {!compact && article.description && (
          <p className="mt-2 text-sm text-white/45 leading-relaxed line-clamp-2 flex-1">
            {article.description}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary/60 group-hover:text-primary transition">
          Đọc bài viết
          <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  )
}

// ── Grid wrapper ──

interface NewsArticleGridProps {
  articles: NewsArticle[]
  compact?: boolean
}

export function NewsArticleGrid({ articles, compact = false }: NewsArticleGridProps) {
  return (
    <div className={`grid gap-5 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {articles.map((article) => (
        <NewsArticleCard key={article.id} article={article} compact={compact} />
      ))}
    </div>
  )
}
