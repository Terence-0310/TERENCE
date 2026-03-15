// ============================================
// Raw TMDB API response types
// ============================================

export interface TmdbMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  adult: boolean
  original_language: string
  video: boolean
  media_type?: string
}

export interface TmdbMovieDetail extends Omit<TmdbMovie, 'genre_ids'> {
  genres: TmdbGenre[]
  runtime: number | null
  status: string
  tagline: string | null
  budget: number
  revenue: number
  homepage: string | null
  imdb_id: string | null
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  spoken_languages: { iso_639_1: string; name: string; english_name: string }[]
  belongs_to_collection: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null
}

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbVideo {
  id: string
  iso_639_1: string
  iso_3166_1: string
  key: string
  name: string
  site: string
  size: number
  type: string
  official: boolean
  published_at: string
}

export interface TmdbCast {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TmdbCrew {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TmdbWatchProvider {
  logo_path: string
  provider_id: number
  provider_name: string
  display_priority: number
}

export interface TmdbWatchProviderResult {
  results: Record<string, {
    link: string
    flatrate?: TmdbWatchProvider[]
    rent?: TmdbWatchProvider[]
    buy?: TmdbWatchProvider[]
  }>
}

// API responses
export interface TmdbPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface TmdbVideosResponse {
  id: number
  results: TmdbVideo[]
}

export interface TmdbCreditsResponse {
  id: number
  cast: TmdbCast[]
  crew: TmdbCrew[]
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[]
}
