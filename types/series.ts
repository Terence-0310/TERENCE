// ============================================
// TV Series types — TMDB raw API responses
// ============================================

// ── Raw TMDB types ──

export interface TmdbTvShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  origin_country: string[]
  original_language: string
  media_type?: string
}

export interface TmdbTvDetail extends Omit<TmdbTvShow, 'genre_ids'> {
  genres: { id: number; name: string }[]
  number_of_seasons: number
  number_of_episodes: number
  status: string
  tagline: string | null
  homepage: string | null
  episode_run_time: number[]
  in_production: boolean
  last_air_date: string | null
  seasons: TmdbSeason[]
  created_by: { id: number; name: string; profile_path: string | null }[]
  networks: { id: number; name: string; logo_path: string | null }[]
}

export interface TmdbSeason {
  id: number
  season_number: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string | null
  episode_count: number
}

export interface TmdbSeasonDetail {
  id: number
  season_number: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string | null
  episodes: TmdbEpisode[]
}

export interface TmdbEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  vote_average: number
  runtime: number | null
}

// ── App domain models ──

export interface Series {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  firstAirDate: string
  year: number
  voteAverage: number
  voteCount: number
  popularity: number
  genreIds: number[]
  mediaType: 'tv'
}

export interface SeriesDetail extends Series {
  tagline: string | null
  status: string
  numberOfSeasons: number
  numberOfEpisodes: number
  inProduction: boolean
  seasons: Season[]
  creators: { id: number; name: string; profileUrl: string | null }[]
}

export interface Season {
  id: number
  seasonNumber: number
  name: string
  overview: string
  posterUrl: string | null
  airDate: string | null
  episodeCount: number
}

export interface SeasonDetail extends Season {
  episodes: SeriesEpisode[]
}

export interface SeriesEpisode {
  id: number
  episodeNumber: number
  seasonNumber: number
  title: string
  overview: string
  stillUrl: string | null
  airDate: string | null
  voteAverage: number
  runtime: number | null
  runtimeFormatted: string
  slug: string // e.g. "s1-ep3"
}
