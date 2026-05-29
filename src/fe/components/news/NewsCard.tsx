'use client'

import { useState, useCallback } from 'react'
import { Newspaper } from 'lucide-react'
import { formatRelativeDate } from '@/src/be/modules/news/format'

export function NewsCard({ article }: { article: { id: string; title: string; description?: string; url: string; image?: string; sourceName: string; publishedAt: string } }) {
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
