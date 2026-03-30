// ============================================
// Movie News & Upcoming — Type Definitions
// ============================================

/** A news article from external API (GNews / NewsAPI) */
export interface NewsArticle {
  id: string
  title: string
  description?: string
  url: string
  image?: string
  sourceName: string
  publishedAt: string
  author?: string
  keywords?: string[]
  /** Relevance score (higher = more relevant). Used for re-ranking. */
  relevanceScore?: number
}

/** An upcoming movie item from TMDB */
export interface UpcomingMovieItem {
  id: string
  tmdbId: number
  title: string
  originalTitle?: string
  overview?: string
  poster?: string
  backdrop?: string
  releaseDate?: string
  /** Pre-formatted release date string for display */
  releaseDateFormatted?: string
  voteAverage?: number
  popularity?: number
  genreIds?: number[]
}

/** Standardized API list response */
export interface ApiListResponse<T> {
  items: T[]
  total?: number
  source?: string
  fetchedAt?: string
}

/** Query params for news API */
export interface NewsQueryParams {
  /** Search query (e.g., movie title) */
  q?: string
  /** Country code for top headlines */
  country?: string
  /** Language code */
  lang?: string
  /** Max results */
  limit?: number
}

/** Query params for upcoming movies API */
export interface UpcomingQueryParams {
  /** Region code for TMDB (e.g., VN, US) */
  region?: string
  /** Page number */
  page?: number
}

/** Related news query context from movie detail */
export interface RelatedNewsContext {
  title: string
  originalTitle?: string
  year?: number
}
