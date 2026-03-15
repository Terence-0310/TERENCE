// ============================================
// Mapper: Raw TMDB → App domain model
// ============================================

import type { TmdbMovie, TmdbMovieDetail, TmdbGenre, TmdbVideo, TmdbCast, TmdbCrew } from '@/types/tmdb'
import type { Movie, MovieDetail, Genre, CastMember, CrewMember, VideoItem } from '@/types/movie'
import { tmdbPosterUrl, tmdbBackdropUrl, tmdbProfileUrl } from './config'

export function mapMovie(raw: TmdbMovie): Movie {
  const year = raw.release_date ? parseInt(raw.release_date.substring(0, 4), 10) : 0
  return {
    id: raw.id,
    title: raw.title || raw.original_title,
    originalTitle: raw.original_title,
    overview: raw.overview,
    posterUrl: tmdbPosterUrl(raw.poster_path),
    backdropUrl: tmdbBackdropUrl(raw.backdrop_path),
    releaseDate: raw.release_date || '',
    year,
    voteAverage: Math.round(raw.vote_average * 10) / 10,
    voteCount: raw.vote_count,
    popularity: raw.popularity,
    genreIds: raw.genre_ids || [],
    genres: [],
    runtime: null,
    runtimeFormatted: '',
    mediaType: (raw.media_type as 'movie' | 'tv') || 'movie',
  }
}

export function mapMovieDetail(
  raw: TmdbMovieDetail,
  credits?: { cast: TmdbCast[]; crew: TmdbCrew[] },
  videos?: TmdbVideo[],
  related?: TmdbMovie[],
): MovieDetail {
  const base = mapMovie(raw as unknown as TmdbMovie)
  const genres = (raw.genres || []).map(mapGenre)
  const mappedCast = (credits?.cast || []).slice(0, 20).map(mapCast)
  const mappedCrew = (credits?.crew || []).filter(c => ['Director', 'Producer', 'Screenplay'].includes(c.job)).map(mapCrew)
  const mappedVideos = (videos || []).map(mapVideo)
  // Priority: YouTube Trailer > YouTube Teaser > any YouTube video
  const youtubeVideos = mappedVideos.filter(v => v.site === 'YouTube')
  const trailer =
    youtubeVideos.find(v => v.type === 'Trailer') ||
    youtubeVideos.find(v => v.type === 'Teaser') ||
    youtubeVideos[0] ||
    null
  const minutes = raw.runtime || 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return {
    ...base,
    genres,
    genreIds: genres.map(g => g.id),
    runtime: raw.runtime,
    runtimeFormatted: minutes > 0 ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : '',
    tagline: raw.tagline || null,
    status: raw.status || '',
    budget: raw.budget || 0,
    revenue: raw.revenue || 0,
    imdbId: raw.imdb_id || null,
    homepage: raw.homepage || null,
    cast: mappedCast,
    crew: mappedCrew,
    trailer,
    videos: mappedVideos,
    relatedMovies: (related || []).map(mapMovie),
  }
}

export function mapGenre(raw: TmdbGenre): Genre {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-'),
  }
}

function mapCast(raw: TmdbCast): CastMember {
  return {
    id: raw.id,
    name: raw.name,
    character: raw.character,
    profileUrl: tmdbProfileUrl(raw.profile_path),
  }
}

function mapCrew(raw: TmdbCrew): CrewMember {
  return {
    id: raw.id,
    name: raw.name,
    job: raw.job,
    department: raw.department,
  }
}

function mapVideo(raw: TmdbVideo): VideoItem {
  const isYouTube = raw.site === 'YouTube'
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    site: raw.site,
    type: raw.type,
    isTrailer: (raw.type === 'Trailer' || raw.type === 'Teaser') && isYouTube,
    youtubeUrl: isYouTube ? `https://www.youtube.com/watch?v=${raw.key}` : '',
    embedUrl: isYouTube ? `https://www.youtube.com/embed/${raw.key}?rel=0&modestbranding=1` : '',
  }
}
