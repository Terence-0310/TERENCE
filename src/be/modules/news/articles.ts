// ============================================
// News Articles Service — server-side (optimized)
// ============================================
// Fetches entertainment news from GNews API.
// Falls back to hardcoded data when API key is missing.
//
// GNews API: https://gnews.io/docs/v4
// Free tier: 100 requests/day, 10 articles/request
//
// Optimizations:
// - Strong title + URL dedup
// - Movie-keyword re-ranking for top headlines
// - Multi-tier related query with relevance scoring
// - Smart language fallback (vi → en)
// - Cache per query to minimize API calls

import { mapGNewsArticles, rankArticlesByRelevance } from './mappers'
import type { NewsArticle, RelatedNewsContext } from './legacy-types'

// ── Config ──

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || ''
const GNEWS_BASE_URL = 'https://gnews.io/api/v4'

// ── In-memory cache ──

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<NewsArticle[]>>()

function getCached(key: string): NewsArticle[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: NewsArticle[], ttlMs: number): void {
  // Limit cache size to prevent memory leaks
  if (cache.size > 200) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// ── Movie-related keywords for re-ranking top headlines ──

const ENTERTAINMENT_MOVIE_KEYWORDS = [
  'movie', 'film', 'trailer', 'cinema', 'box office',
  'actor', 'actress', 'director', 'sequel', 'premiere',
  'marvel', 'disney', 'netflix', 'warner', 'paramount',
  'oscar', 'emmy', 'golden globe', 'award',
  'phim', 'rạp chiếu', 'đạo diễn', 'diễn viên',
  'bom tấn', 'siêu anh hùng',
]

// ── Public API ──

/**
 * Get top entertainment news headlines.
 * Re-ranks results to prioritize movie-related content.
 */
export async function getTopEntertainmentNews(params?: {
  country?: string
  lang?: string
  limit?: number
}): Promise<NewsArticle[]> {
  const { country = 'vi', lang = 'vi', limit = 10 } = params ?? {}

  const cacheKey = `top-${country}-${lang}-${limit}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!GNEWS_API_KEY) {
    console.warn('[articles] GNEWS_API_KEY not set — using fallback data')
    return getFallbackNews()
  }

  try {
    // Fetch primary results
    let articles = await fetchTopHeadlines(country, lang, limit)

    // If VN results are too few, supplement with English
    if (articles.length < 3 && country === 'vi') {
      console.info('[articles] VN results too few — supplementing with EN')
      const enArticles = await fetchTopHeadlines('us', 'en', limit)
      articles = deduplicateArticles([...articles, ...enArticles])
    }

    // Re-rank: boost movie-related articles
    articles = reRankByMovieRelevance(articles)

    // Cache 20 minutes
    const final = articles.slice(0, limit)
    setCache(cacheKey, final, 20 * 60 * 1000)

    return final
  } catch (err) {
    console.error('[articles] Failed to fetch top news:', (err as Error).message)
    return getFallbackNews()
  }
}

/**
 * Get news articles related to a specific movie.
 * Multi-tier query strategy with relevance scoring.
 *
 * @param params.query - Movie title
 * @param params.context - Rich context for better scoring
 * @param params.limit - Max items
 */
export async function getRelatedMovieNews(params: {
  query: string
  context?: RelatedNewsContext
  limit?: number
}): Promise<NewsArticle[]> {
  const { query, context, limit = 6 } = params

  if (!query.trim()) return []

  const cacheKey = `related-${query.toLowerCase().trim()}-${limit}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!GNEWS_API_KEY) {
    console.warn('[articles] GNEWS_API_KEY not set — returning empty related news')
    return []
  }

  const title = query.trim()
  const originalTitle = context?.originalTitle?.trim()
  const year = context?.year

  // Build tiered queries (most specific → broadest)
  // Only try the minimum needed to get results
  const tierQueries: string[][] = [
    // Tier 1: exact movie title
    [`"${title}" movie`, `"${title}" film`],
    // Tier 2: with year or original title
    [
      ...(year ? [`"${title}" ${year}`] : []),
      ...(originalTitle && originalTitle !== title ? [`"${originalTitle}" movie`] : []),
    ].filter(Boolean),
    // Tier 3: broader
    [`"${title}" trailer`, `"${title}" review`, `"${title}" cast`],
    // Tier 4: broadest fallback
    [`${title} movie release`, `${title} film news`],
  ]

  const allArticles: NewsArticle[] = []

  for (const tier of tierQueries) {
    for (const q of tier) {
      if (!q) continue
      try {
        const articles = await searchGNews(q, 'en', 10)
        if (articles.length > 0) {
          allArticles.push(...articles)
          break // Got results from this tier, skip remaining queries in tier
        }
      } catch {
        // Try next query
      }
    }

    // If we have enough results, stop
    if (allArticles.length >= limit) break
  }

  if (allArticles.length === 0) return []

  // Deduplicate all collected articles
  let final = deduplicateArticles(allArticles)

  // Re-rank by relevance
  if (context || title) {
    final = rankArticlesByRelevance(final, {
      title,
      originalTitle,
      year,
    })
  }

  // Cache 45 minutes
  const result = final.slice(0, limit)
  setCache(cacheKey, result, 45 * 60 * 1000)

  return result
}

/**
 * Search news by keyword with optional type filter.
 * Used by the /news page search bar and category tabs.
 */
export async function searchNewsByKeyword(params: {
  query: string
  type?: 'all' | 'trailer' | 'review' | 'breaking'
  limit?: number
}): Promise<NewsArticle[]> {
  const { query, type = 'all', limit = 10 } = params

  if (!query.trim()) return []

  const cacheKey = `search-${type}-${query.toLowerCase().trim()}-${limit}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!GNEWS_API_KEY) {
    console.warn('[articles] GNEWS_API_KEY not set — returning empty search')
    return []
  }

  // Build search queries based on type
  const typeKeywords: Record<string, string[]> = {
    trailer: ['trailer', 'teaser', 'official trailer'],
    review: ['review', 'đánh giá', 'critique', 'rating'],
    breaking: ['breaking', 'tin nóng', 'exclusive', 'just announced'],
    all: ['movie', 'film', 'phim'],
  }

  const keywords = typeKeywords[type] || typeKeywords.all
  const title = query.trim()

  // Try queries in order: most specific → broad
  const queries = [
    `"${title}" ${keywords[0]}`,
    ...(keywords.length > 1 ? [`"${title}" ${keywords[1]}`] : []),
    `${title} ${keywords[0]}`,
  ]

  const allArticles: NewsArticle[] = []

  for (const q of queries) {
    try {
      const articles = await searchGNews(q, 'en', 10)
      if (articles.length > 0) {
        allArticles.push(...articles)
        break // Got results, stop
      }
    } catch {
      // Try next query
    }
  }

  // If no results in English, try Vietnamese
  if (allArticles.length === 0) {
    try {
      const viArticles = await searchGNews(`${title} phim`, 'vi', 10)
      allArticles.push(...viArticles)
    } catch {
      // No results at all
    }
  }

  const final = deduplicateArticles(allArticles).slice(0, limit)
  setCache(cacheKey, final, 30 * 60 * 1000) // Cache 30 minutes

  return final
}

/**
 * Get news by category/type (for tab content on /news page).
 * Pre-defined queries for trailer/review tabs.
 */
export async function getNewsByCategory(category: 'trailer' | 'review'): Promise<NewsArticle[]> {
  const cacheKey = `category-${category}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!GNEWS_API_KEY) {
    return getFallbackNews().slice(0, 4)
  }

  const queries: Record<string, string> = {
    trailer: 'movie trailer OR official trailer OR teaser 2026',
    review: 'movie review OR film review OR film critique 2026',
  }

  try {
    const articles = await searchGNews(queries[category] || queries.trailer, 'en', 10)
    const final = deduplicateArticles(articles)
    setCache(cacheKey, final, 25 * 60 * 1000) // Cache 25 minutes
    return final
  } catch {
    return getFallbackNews().slice(0, 4)
  }
}

// ═════════════════════════════════════════════
// Internal helpers
// ═════════════════════════════════════════════

async function fetchTopHeadlines(
  country: string,
  lang: string,
  max: number,
): Promise<NewsArticle[]> {
  const url = new URL(`${GNEWS_BASE_URL}/top-headlines`)
  url.searchParams.set('apikey', GNEWS_API_KEY)
  url.searchParams.set('category', 'entertainment')
  url.searchParams.set('lang', lang)
  url.searchParams.set('country', country)
  url.searchParams.set('max', String(Math.min(max, 10)))

  const response = await fetch(url.toString(), {
    next: { revalidate: 1200 }, // 20 minutes
  })

  if (!response.ok) {
    console.error(`[articles] GNews headlines error: ${response.status} ${response.statusText}`)
    return []
  }

  const data = await response.json()
  return mapGNewsArticles(data)
}

async function searchGNews(
  query: string,
  lang: string,
  max: number,
): Promise<NewsArticle[]> {
  const url = new URL(`${GNEWS_BASE_URL}/search`)
  url.searchParams.set('apikey', GNEWS_API_KEY)
  url.searchParams.set('q', query)
  url.searchParams.set('lang', lang)
  url.searchParams.set('max', String(Math.min(max, 10)))
  url.searchParams.set('sortby', 'relevance') // Changed from publishedAt to relevance

  const response = await fetch(url.toString(), {
    next: { revalidate: 2700 }, // 45 minutes
  })

  if (!response.ok) {
    console.error(`[articles] GNews search error: ${response.status}`)
    return []
  }

  const data = await response.json()
  return mapGNewsArticles(data)
}

/** Re-rank articles to boost movie-related content */
function reRankByMovieRelevance(articles: NewsArticle[]): NewsArticle[] {
  return articles
    .map((article) => {
      let score = 0
      const text = `${article.title} ${article.description ?? ''}`.toLowerCase()

      for (const kw of ENTERTAINMENT_MOVIE_KEYWORDS) {
        if (text.includes(kw)) score += 3
      }

      // Has image is better
      if (article.image) score += 2
      // Has description is better
      if (article.description && article.description.length > 20) score += 1

      return { ...article, relevanceScore: score }
    })
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
}

/** Cross-article dedup by normalized URL and title */
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()

  return articles.filter((a) => {
    // Dedup by URL (strip tracking params)
    const normUrl = normalizeUrlForDedup(a.url)
    if (seenUrls.has(normUrl)) return false
    seenUrls.add(normUrl)

    // Dedup by title similarity
    const normTitle = a.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 50)
    if (seenTitles.has(normTitle)) return false
    seenTitles.add(normTitle)

    return true
  })
}

function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    u.searchParams.delete('ref')
    return u.origin + u.pathname
  } catch {
    return url
  }
}

// ═════════════════════════════════════════════
// Fallback hardcoded news
// ═════════════════════════════════════════════

function getFallbackNews(): NewsArticle[] {
  return [
    {
      id: 'fallback-1',
      title: 'Hamnet trở lại ngôi đầu bảng tại box office Anh & Ireland',
      description: 'Phim Hamnet của Chloé Zhao đã tái chiếm vị trí số 1 tại phòng vé Anh & Ireland, vượt qua nhiều bom tấn lớn.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-2',
      title: 'Dune Part 3 chính thức ấn định ngày khởi chiếu vào cuối 2027',
      description: 'Warner Bros. xác nhận Dune Part 3 sẽ ra mắt vào cuối năm 2027. Denis Villeneuve tiếp tục đạo diễn.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-3',
      title: 'Sam Raimi không loại trừ khả năng làm Spider-Man 4 với Tobey Maguire',
      description: 'Đạo diễn Sam Raimi cho biết ông vẫn cởi mở với ý tưởng làm phần thứ tư trong loạt phim với Tobey Maguire.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-4',
      title: 'Lễ trao giải Oscar 2026: Những đề cử đáng chú ý nhất năm nay',
      description: 'Danh sách đề cử Oscar 2026 chính thức được công bố với nhiều bất ngờ. Các phim indie chiếm ưu thế.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-5',
      title: 'Look Back – Bộ phim anime khiến người ta im lặng rất lâu',
      description: 'Look Back không cố làm bạn xúc động, chỉ nhẹ nhàng đặt trước mặt bạn những ký ức và đam mê.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-6',
      title: 'Cõng Anh Mà Chạy – Khi tình yêu vượt qua cả thời gian',
      description: 'Một hành trình cảm xúc về ký ức, mất mát và tình yêu bền bỉ.',
      url: '#',
      image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80',
      sourceName: 'Terence News',
      publishedAt: new Date().toISOString(),
    },
  ]
}
