// ============================================
// TMDB API Response Types
// ============================================

export interface TmdbSearchMovieResult {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string // "2026-01-15"
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  original_language: string
  adult: boolean
}

export interface TmdbSearchTvResult {
  id: number
  name: string
  original_name: string
  overview: string
  first_air_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  original_language: string
  origin_country: string[]
}

export interface TmdbSearchResponse<T> {
  page: number
  results: T[]
  total_results: number
  total_pages: number
}

export interface TmdbExternalIds {
  imdb_id: string | null
  tvdb_id: number | null
  facebook_id: string | null
  instagram_id: string | null
  twitter_id: string | null
}

export interface TmdbVideo {
  id: string
  key: string        // YouTube/Vimeo key
  name: string
  site: string       // "YouTube" | "Vimeo"
  size: number
  type: string       // "Trailer" | "Teaser" | "Clip" | "Featurette"
  official: boolean
  published_at: string
  iso_639_1: string
  iso_3166_1: string
}

export interface TmdbVideosResponse {
  id: number
  results: TmdbVideo[]
}

export interface TmdbCastMember {
  id: number
  name: string
  original_name: string
  character: string
  profile_path: string | null
  gender: number       // 0=not set, 1=female, 2=male, 3=non-binary
  known_for_department: string
  popularity: number
  order: number
}

export interface TmdbCrewMember {
  id: number
  name: string
  original_name: string
  job: string          // "Director", "Writer", "Producer"
  department: string   // "Directing", "Writing", "Production"
  profile_path: string | null
  gender: number
  known_for_department: string
  popularity: number
}

export interface TmdbCreditsResponse {
  id: number
  cast: TmdbCastMember[]
  crew: TmdbCrewMember[]
}

export interface TmdbMovieDetail {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string
  runtime: number | null
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  imdb_id: string | null
  status: string
  genres: Array<{ id: number; name: string }>
}

export interface TmdbTvDetail {
  id: number
  name: string
  original_name: string
  overview: string
  first_air_date: string
  episode_run_time: number[]
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  status: string
  number_of_seasons: number
  number_of_episodes: number
  genres: Array<{ id: number; name: string }>
}

/** Result of a TMDB matching attempt */
export interface MatchResult {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle: string
  year: number | null
  confidence: number     // 0.0 → 1.0
  matchMethod: string    // "originalTitle+year" | "title+year" | "normalized" | "ophim_tmdb_id"
}

/** Result of enriching a single movie */
export interface EnrichResult {
  movieId: string
  movieTitle: string
  action: 'enrich' | 'skip' | 'fail'
  tmdbId?: number
  confidence?: number
  matchMethod?: string
  fieldsUpdated?: string[]
  message: string
  error?: string
}
