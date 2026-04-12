// ============================================
// TV Service — TMDB TV series operations
// ============================================

import { tmdbFetch, tmdbFetchSafe } from '@/src/be/modules/tmdb/legacy/client'
import { tmdbImage } from '@/lib/tmdb-image'
import type { TmdbPaginatedResponse } from '@/types/tmdb'
import type {
  TmdbTvShow,
  TmdbTvDetail,
  TmdbSeasonDetail,
  TmdbSeason,
  Series,
  SeriesDetail,
  Season,
  SeasonDetail,
  SeriesEpisode,
} from '@/types/series'

// ── Mappers ──

function mapTvShow(raw: TmdbTvShow): Series {
  const year = raw.first_air_date ? parseInt(raw.first_air_date.substring(0, 4), 10) : 0
  return {
    id: raw.id,
    title: raw.name || raw.original_name,
    originalTitle: raw.original_name,
    overview: raw.overview,
    posterUrl: tmdbImage(raw.poster_path, 'w500'),
    backdropUrl: tmdbImage(raw.backdrop_path, 'w1280'),
    firstAirDate: raw.first_air_date || '',
    year,
    voteAverage: Math.round(raw.vote_average * 10) / 10,
    voteCount: raw.vote_count,
    popularity: raw.popularity,
    genreIds: raw.genre_ids || [],
    mediaType: 'tv',
  }
}

function mapSeason(raw: TmdbSeason): Season {
  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview,
    posterUrl: tmdbImage(raw.poster_path, 'w500'),
    airDate: raw.air_date,
    episodeCount: raw.episode_count,
  }
}

function mapEpisode(raw: TmdbSeasonDetail['episodes'][number]): SeriesEpisode {
  const minutes = raw.runtime || 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return {
    id: raw.id,
    episodeNumber: raw.episode_number,
    seasonNumber: raw.season_number,
    title: raw.name || `Tập ${raw.episode_number}`,
    overview: raw.overview || '',
    stillUrl: raw.still_path ? tmdbImage(raw.still_path, 'w300') : null,
    airDate: raw.air_date,
    voteAverage: Math.round(raw.vote_average * 10) / 10,
    runtime: raw.runtime,
    runtimeFormatted: minutes > 0 ? (hours > 0 ? `${hours}h${mins}m` : `${mins}m`) : '',
    slug: `s${raw.season_number}-ep${raw.episode_number}`,
  }
}

// ── Service functions ──

export async function getTvPopular(page = 1) {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/tv/popular', {
    params: { page },
    revalidate: 3600,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvTrending(page = 1) {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/trending/tv/week', {
    params: { page },
    revalidate: 1800,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvTopRated(page = 1) {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/tv/top_rated', {
    params: { page },
    revalidate: 3600,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvDetail(id: number): Promise<SeriesDetail> {
  const raw = await tmdbFetch<TmdbTvDetail>(`/tv/${id}`, { revalidate: 3600 })

  // Filter out season 0 (Specials) unless it's the only season
  const seasons = (raw.seasons || [])
    .filter(s => s.season_number > 0 || raw.number_of_seasons <= 1)
    .map(mapSeason)

  return {
    id: raw.id,
    title: raw.name || raw.original_name,
    originalTitle: raw.original_name,
    overview: raw.overview,
    posterUrl: tmdbImage(raw.poster_path, 'w500'),
    backdropUrl: tmdbImage(raw.backdrop_path, 'w1280'),
    firstAirDate: raw.first_air_date || '',
    year: raw.first_air_date ? parseInt(raw.first_air_date.substring(0, 4), 10) : 0,
    voteAverage: Math.round(raw.vote_average * 10) / 10,
    voteCount: raw.vote_count,
    popularity: raw.popularity,
    genreIds: [],
    mediaType: 'tv',
    tagline: raw.tagline || null,
    status: raw.status || '',
    numberOfSeasons: raw.number_of_seasons,
    numberOfEpisodes: raw.number_of_episodes,
    inProduction: raw.in_production,
    seasons,
    creators: (raw.created_by || []).map(c => ({
      id: c.id,
      name: c.name,
      profileUrl: tmdbImage(c.profile_path, 'w185'),
    })),
  }
}

export async function getSeasonDetail(tvId: number, seasonNumber: number): Promise<SeasonDetail | null> {
  const raw = await tmdbFetchSafe<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`, {
    revalidate: 3600,
  })
  if (!raw) return null

  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview || '',
    posterUrl: tmdbImage(raw.poster_path, 'w500'),
    airDate: raw.air_date,
    episodeCount: (raw.episodes || []).length,
    episodes: (raw.episodes || []).map(mapEpisode),
  }
}

export async function searchTv(query: string, page = 1) {
  if (!query.trim()) return { items: [], page: 1, totalPages: 0, totalResults: 0 }

  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/search/tv', {
    params: { query: query.trim(), page, include_adult: 'false' },
    revalidate: 600,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvByGenre(genreId: number, page = 1) {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/discover/tv', {
    params: {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page,
    },
    revalidate: 3600,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvByCountry(countryCode: string, page = 1) {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvShow>>('/discover/tv', {
    params: {
      with_origin_country: countryCode,
      sort_by: 'popularity.desc',
      page,
    },
    revalidate: 3600,
  })
  return {
    items: data.results.map(mapTvShow),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

export async function getTvGenres() {
  const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/tv/list', {
    revalidate: 86400,
  })
  return data.genres.map(g => ({
    id: g.id,
    name: g.name,
    slug: g.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
  }))
}
