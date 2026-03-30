// ============================================
// News Module — Mappers (optimized)
// ============================================
// Normalize raw API responses from GNews / TMDB
// into canonical types. All mappers are null-safe.
// Includes: strong dedup, title normalization,
// relevance scoring, and smart image fallback.

import type { NewsArticle, UpcomingMovieItem } from './types'
import { tmdbPosterUrl, tmdbBackdropUrl } from '@/lib/tmdb/config'

// ═════════════════════════════════════════════
// GNews API types
// ═════════════════════════════════════════════

interface GNewsArticle {
  title?: string
  description?: string
  content?: string
  url?: string
  image?: string
  publishedAt?: string
  source?: { name?: string; url?: string }
}

interface GNewsResponse {
  totalArticles?: number
  articles?: GNewsArticle[]
}

// ═════════════════════════════════════════════
// TMDB raw movie type
// ═════════════════════════════════════════════

interface TmdbRawMovie {
  id?: number
  title?: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  popularity?: number
  genre_ids?: number[]
}

// ═════════════════════════════════════════════
// GNews Mapper
// ═════════════════════════════════════════════

export function mapGNewsArticles(raw: GNewsResponse | null | undefined): NewsArticle[] {
  if (!raw?.articles || !Array.isArray(raw.articles)) return []

  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()

  return raw.articles
    .filter((a): a is GNewsArticle & { title: string; url: string } => {
      if (!a?.title || !a?.url) return false
      // Min title length
      if (a.title.trim().length < 10) return false
      // Dedup by URL
      const normalizedUrl = normalizeUrl(a.url)
      if (seenUrls.has(normalizedUrl)) return false
      seenUrls.add(normalizedUrl)
      // Dedup by normalized title
      const normalizedTitle = normalizeTitle(a.title)
      if (seenTitles.has(normalizedTitle)) return false
      seenTitles.add(normalizedTitle)
      return true
    })
    .map((a, index) => ({
      id: `gnews-${index}-${hashStr(a.url)}`,
      title: cleanTitle(a.title),
      description: a.description ? cleanDescription(a.description) : undefined,
      url: a.url,
      image: a.image && isValidImageUrl(a.image) ? a.image : undefined,
      sourceName: a.source?.name ?? 'Nguồn tin',
      publishedAt: a.publishedAt && isValidDate(a.publishedAt) ? a.publishedAt : new Date().toISOString(),
      keywords: [],
    }))
}

// ═════════════════════════════════════════════
// TMDB Upcoming Mapper
// ═════════════════════════════════════════════

export function mapTmdbUpcoming(
  results: TmdbRawMovie[] | null | undefined,
  options?: { filterFuture?: boolean; requireImage?: boolean },
): UpcomingMovieItem[] {
  if (!results || !Array.isArray(results)) return []

  const { filterFuture = false, requireImage = false } = options ?? {}
  const now = new Date()

  return results
    .filter((m): m is TmdbRawMovie & { id: number; title: string } => {
      if (!m?.id || !m?.title) return false
      // Filter future only if requested
      if (filterFuture && m.release_date) {
        const rd = new Date(m.release_date)
        if (rd < now) return false
      }
      // Require at least one image if requested
      if (requireImage && !m.poster_path && !m.backdrop_path) return false
      return true
    })
    .map((m) => {
      // Smart image: prefer poster, fallback to backdrop
      const poster = m.poster_path ? tmdbPosterUrl(m.poster_path) : undefined
      const backdrop = m.backdrop_path ? tmdbBackdropUrl(m.backdrop_path) : undefined

      return {
        id: `tmdb-${m.id}`,
        tmdbId: m.id,
        title: m.title,
        originalTitle: m.original_title ?? undefined,
        overview: m.overview ?? undefined,
        poster: poster ?? backdrop, // Fallback: use backdrop as poster
        backdrop: backdrop ?? poster, // Fallback: use poster as backdrop
        releaseDate: m.release_date ?? undefined,
        releaseDateFormatted: m.release_date ? formatReleaseDateVN(m.release_date) : undefined,
        voteAverage: m.vote_average ?? undefined,
        popularity: m.popularity ?? undefined,
        genreIds: m.genre_ids ?? [],
      }
    })
    .sort((a, b) => {
      // Sort: future dates first (ascending), then by popularity
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : Infinity
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : Infinity
      if (dateA !== dateB) return dateA - dateB
      return (b.popularity ?? 0) - (a.popularity ?? 0)
    })
}

// ═════════════════════════════════════════════
// Relevance Scoring for Related News
// ═════════════════════════════════════════════

const MOVIE_KEYWORDS = [
  'movie', 'film', 'trailer', 'cinema', 'box office',
  'actor', 'actress', 'director', 'cast', 'review',
  'release', 'sequel', 'prequel', 'remake', 'premiere',
  'marvel', 'disney', 'netflix', 'warner', 'sony',
  'phim', 'rạp', 'đạo diễn', 'diễn viên', 'trailer',
]

/**
 * Score and re-rank articles by relevance to a movie.
 * Higher score = more relevant.
 */
export function rankArticlesByRelevance(
  articles: NewsArticle[],
  context: { title: string; originalTitle?: string; year?: number },
): NewsArticle[] {
  const titleLower = context.title.toLowerCase()
  const originalLower = context.originalTitle?.toLowerCase()
  const yearStr = context.year ? String(context.year) : ''

  return articles
    .map((article) => {
      let score = 0
      const textLower = `${article.title} ${article.description ?? ''}`.toLowerCase()

      // Exact title match in article: +50
      if (textLower.includes(titleLower)) score += 50
      // Original title match: +40
      if (originalLower && textLower.includes(originalLower)) score += 40
      // Year match: +15
      if (yearStr && textLower.includes(yearStr)) score += 15

      // Movie-related keyword bonus: +3 each (max +30)
      let keywordScore = 0
      for (const kw of MOVIE_KEYWORDS) {
        if (textLower.includes(kw)) keywordScore += 3
      }
      score += Math.min(keywordScore, 30)

      // Has image: +5
      if (article.image) score += 5
      // Has description: +3
      if (article.description && article.description.length > 30) score += 3
      // Recent: +5 if within 7 days
      if (article.publishedAt) {
        const ageMs = Date.now() - new Date(article.publishedAt).getTime()
        if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 5
      }

      // Penalty for very generic articles
      if (!textLower.includes(titleLower) && (!originalLower || !textLower.includes(originalLower))) {
        score -= 20
      }

      return { ...article, relevanceScore: score }
    })
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
}

// ═════════════════════════════════════════════
// Shared Helpers
// ═════════════════════════════════════════════

/** Normalize title for dedup comparison */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '') // Remove non-alphanumeric (Unicode-safe)
    .slice(0, 60)
}

/** Normalize URL for dedup comparison */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Remove tracking params
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    u.searchParams.delete('ref')
    return u.origin + u.pathname
  } catch {
    return url
  }
}

/** Clean title: trim, remove extra whitespace */
function cleanTitle(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** Clean description: trim, remove truncation artifacts */
function cleanDescription(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\[\+\d+ chars?\]$/i, '')
    .replace(/…+\s*$/, '…')
    .trim()
}

/** Check if a URL looks like a valid image */
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Check if a date string is parseable */
function isValidDate(s: string): boolean {
  const d = new Date(s)
  return !isNaN(d.getTime())
}

/** Format release date as Vietnamese-localized string */
function formatReleaseDateVN(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Simple string hash for dedup IDs */
function hashStr(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
