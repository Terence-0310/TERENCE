'use client'

// ============================================
// NewsArticleCard — Article cards & layouts for /news
// ============================================

import { ArrowUpRight, Newspaper } from 'lucide-react'
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

  if (!article.image || imgError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 via-card to-card ${className}`}>
        <Newspaper className="h-8 w-8 text-white/15" />
        <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-white/25 line-clamp-1">
          {article.sourceName}
        </span>
      </div>
    )
  }
  return (
    <img
      src={article.image}
      alt={article.title}
      // Many news CDNs refuse hotlinked images when a foreign Referer is sent.
      referrerPolicy="no-referrer"
      className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${className}`}
      loading="lazy"
      onError={handleImgError}
    />
  )
}

function ArticleMeta({ article, light = false }: { article: NewsArticle; light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] ${light ? 'text-white/70' : 'text-white/40'}`}>
      <span className="font-semibold text-primary truncate max-w-[140px]">{article.sourceName}</span>
      <span className="h-1 w-1 rounded-full bg-current opacity-50" />
      <time dateTime={article.publishedAt} className="whitespace-nowrap">
        {formatRelativeDate(article.publishedAt)}
      </time>
    </div>
  )
}

// ── Lead story: big image with the headline over it ──

function LeadStory({ article }: { article: NewsArticle }) {
  const description = cleanDescription(article)
  return (
    <ArticleLink
      article={article}
      className="group relative flex min-h-[340px] md:min-h-[440px] overflow-hidden rounded-3xl border border-white/[0.06] bg-card"
    >
      <ArticleImage article={article} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/0" />
      <div className="relative mt-auto p-6 md:p-8">
        <span className="mb-3 inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
          Tiêu điểm
        </span>
        <ArticleMeta article={article} light />
        <h3 className="mt-2 text-xl md:text-3xl font-extrabold leading-tight text-white line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {description && (
          <p className="mt-3 hidden sm:block max-w-2xl text-sm leading-relaxed text-white/65 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </ArticleLink>
  )
}

// ── Row: thumbnail left, headline right ──

function NewsArticleRow({ article }: { article: NewsArticle }) {
  return (
    <ArticleLink
      article={article}
      className="group flex gap-4 rounded-2xl p-2 -m-2 transition-colors hover:bg-white/[0.03]"
    >
      <div className="relative aspect-[4/3] w-28 sm:w-32 flex-shrink-0 overflow-hidden rounded-xl bg-card">
        <ArticleImage article={article} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <ArticleMeta article={article} />
        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-white/90 line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
      </div>
    </ArticleLink>
  )
}

// ── Card: image on top ──

interface NewsArticleCardProps {
  article: NewsArticle
  /** Compact mode for smaller grids */
  compact?: boolean
}

export function NewsArticleCard({ article, compact = false }: NewsArticleCardProps) {
  const description = cleanDescription(article)
  return (
    <ArticleLink
      article={article}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-black/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-card">
        <ArticleImage article={article} className="h-full w-full" />
        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <ArticleMeta article={article} />
        <h3 className="mt-2 font-bold leading-snug text-white line-clamp-2 group-hover:text-primary transition-colors text-[15px]">
          {article.title}
        </h3>
        {!compact && description && (
          <p className="mt-2 text-sm leading-relaxed text-white/45 line-clamp-2">{description}</p>
        )}
      </div>
    </ArticleLink>
  )
}

// ── Layouts ──

interface NewsArticleGridProps {
  articles: NewsArticle[]
  compact?: boolean
}

export function NewsArticleGrid({ articles, compact = false }: NewsArticleGridProps) {
  // One or two big cards would leave most of the row empty: use rows instead.
  if (articles.length < 3) {
    return (
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {articles.map((article) => (
          <NewsArticleRow key={article.id} article={article} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <NewsArticleCard key={article.id} article={article} compact={compact} />
      ))}
    </div>
  )
}

/** Lead story + side list, then the remaining stories as compact rows. */
export function NewsFeatured({ articles }: { articles: NewsArticle[] }) {
  const [lead, ...others] = articles
  if (!lead) return null
  const side = others.slice(0, 4)
  const rest = others.slice(4)
  // Two columns of rows: drop a dangling last item so the block ends evenly.
  const restEven = rest.length > 1 ? rest.slice(0, rest.length - (rest.length % 2)) : rest

  return (
    <div className="space-y-10">
      <div className={`grid grid-cols-1 gap-6 ${side.length > 0 ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
        <LeadStory article={lead} />
        {side.length > 0 && (
          <div className="flex flex-col justify-between gap-5 rounded-3xl border border-white/[0.06] bg-card/30 p-5">
            {side.map((article) => (
              <NewsArticleRow key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {restEven.length > 0 && (
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2 border-t border-white/[0.06] pt-8">
          {restEven.map((article) => (
            <NewsArticleRow key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
