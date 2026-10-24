'use client'

// ============================================
// NewsArticleCard — Article cards & layouts for /news (baomoi-style)
// ============================================

import { Newspaper } from 'lucide-react'
import { formatRelativeDate } from '@/src/be/modules/news/format'
import { useState, useCallback, type ReactNode } from 'react'
import type { NewsArticle } from '@/src/be/modules/news/legacy-types'

// ── Shared helpers ──

// GNews descriptions often end with the source name ("… - VnExpress").
function cleanDescription(article: NewsArticle): string | undefined {
  const desc = article.description?.trim()
  if (!desc) return undefined
  const source = article.sourceName.trim()
  if (source && desc.endsWith(source)) {
    return desc.slice(0, -source.length).replace(/[\s\-–—|.…]+$/, '').trim() || undefined
  }
  return desc
}

// Internal articles (DB-backed NewsPost) start with `/news/`. External
// articles (GNews, fallbacks) open in a new tab. Picking the link target
// per-article keeps clicks on our own posts inside the SPA.
function ArticleLink({ article, className, children }: { article: NewsArticle; className?: string; children: ReactNode }) {
  const isInternal = typeof article.url === 'string' && article.url.startsWith('/')
  return (
    <a
      href={article.url}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noopener noreferrer'}
      className={className}
    >
      {children}
    </a>
  )
}

function ArticleImage({ article, className = '' }: { article: NewsArticle; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  return (
    <div className={`relative overflow-hidden rounded-lg bg-card ${className}`}>
      {article.image && !imgError ? (
        <img
          src={article.image}
          alt={article.title}
          // Many news CDNs refuse hotlinked images when a foreign Referer is sent.
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          onError={handleImgError}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/15 via-card to-card">
          <Newspaper className="h-7 w-7 text-white/15" />
          <span className="px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/25 line-clamp-1">
            {article.sourceName}
          </span>
        </div>
      )}
    </div>
  )
}

function ArticleMeta({ article }: { article: NewsArticle }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-white/40">
      <span className="font-semibold text-primary/90 truncate max-w-[160px]">{article.sourceName}</span>
      <time dateTime={article.publishedAt} className="whitespace-nowrap">
        {formatRelativeDate(article.publishedAt)}
      </time>
    </div>
  )
}

const titleHover = 'group-hover:text-primary transition-colors'

// ── Lead story: headline + summary on the left, big image on the right ──

export function NewsLead({ article }: { article: NewsArticle }) {
  const description = cleanDescription(article)
  return (
    <ArticleLink article={article} className="group grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="order-2 md:order-1 min-w-0">
        <h2 className={`text-2xl lg:text-[28px] font-bold leading-snug text-white ${titleHover}`}>
          {article.title}
        </h2>
        <div className="mt-3"><ArticleMeta article={article} /></div>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-white/55 line-clamp-5">{description}</p>
        )}
      </div>
      <ArticleImage article={article} className="order-1 md:order-2 aspect-[3/2]" />
    </ArticleLink>
  )
}

// ── Image on top, headline below (row of three under the lead) ──

function NewsTile({ article }: { article: NewsArticle }) {
  return (
    // Phones: thumbnail-left row, like NewsList, so three tiles don't stack as huge images.
    <ArticleLink article={article} className="group flex min-w-0 gap-4 sm:block">
      <ArticleImage article={article} className="aspect-[3/2] w-32 flex-shrink-0 sm:w-auto sm:aspect-[16/9]" />
      <div className="min-w-0 flex-1">
        <h3 className={`sm:mt-3 text-[15px] font-semibold leading-snug text-white/90 line-clamp-3 ${titleHover}`}>
          {article.title}
        </h3>
        <div className="mt-2"><ArticleMeta article={article} /></div>
      </div>
    </ArticleLink>
  )
}

export function NewsTileRow({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
      {articles.map((article) => (
        <NewsTile key={article.id} article={article} />
      ))}
    </div>
  )
}

// ── Thumbnail left, headline + summary right, separated by rules ──

export function NewsList({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="divide-y divide-white/[0.07]">
      {articles.map((article) => {
        const description = cleanDescription(article)
        return (
          <ArticleLink key={article.id} article={article} className="group flex gap-4 md:gap-5 py-5 first:pt-0 last:pb-0">
            <ArticleImage article={article} className="aspect-[3/2] w-32 sm:w-48 md:w-60 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className={`text-[15px] md:text-lg font-semibold leading-snug text-white/90 line-clamp-3 ${titleHover}`}>
                {article.title}
              </h3>
              <div className="mt-2"><ArticleMeta article={article} /></div>
              {description && (
                <p className="mt-2 hidden sm:block text-sm leading-relaxed text-white/45 line-clamp-2">{description}</p>
              )}
            </div>
          </ArticleLink>
        )
      })}
    </div>
  )
}

// ── Text-only headlines for the sidebar ──

export function NewsHeadlineList({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="divide-y divide-white/[0.07]">
      {articles.map((article) => (
        <ArticleLink key={article.id} article={article} className="group block py-3.5 first:pt-0 last:pb-0">
          <h3 className={`text-[15px] leading-snug text-white/85 line-clamp-3 ${titleHover}`}>{article.title}</h3>
          <div className="mt-1.5"><ArticleMeta article={article} /></div>
        </ArticleLink>
      ))}
    </div>
  )
}

// ── Card grid (used by related posts on /news/[slug]) ──

interface NewsArticleCardProps {
  article: NewsArticle
  /** Compact mode hides the summary */
  compact?: boolean
}

export function NewsArticleCard({ article, compact = false }: NewsArticleCardProps) {
  const description = cleanDescription(article)
  return (
    <ArticleLink article={article} className="group min-w-0">
      <ArticleImage article={article} className="aspect-[16/9]" />
      <h3 className={`mt-3 font-semibold leading-snug text-white/90 line-clamp-2 ${titleHover}`}>{article.title}</h3>
      <div className="mt-2"><ArticleMeta article={article} /></div>
      {!compact && description && (
        <p className="mt-2 text-sm leading-relaxed text-white/45 line-clamp-2">{description}</p>
      )}
    </ArticleLink>
  )
}

interface NewsArticleGridProps {
  articles: NewsArticle[]
  compact?: boolean
}

export function NewsArticleGrid({ articles, compact = false }: NewsArticleGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <NewsArticleCard key={article.id} article={article} compact={compact} />
      ))}
    </div>
  )
}
