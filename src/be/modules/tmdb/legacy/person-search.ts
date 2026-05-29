// ============================================
// TMDB Person Search → Credits adapter
// ============================================
// When a user searches a person's name on /browse, the ES movie index can
// only return films we've already synced. This module bypasses that limit
// by asking TMDB directly for the person's full filmography. The returned
// items are SearchResultItem-compatible so the existing CatalogView grid
// renders them, and clicking any card hits /movie/{tmdbId} or /tv/{tmdbId}
// which lazy-creates the DB row on demand.
//
// Cached at the tmdbFetch layer (revalidate=3600 → 1h).

import { tmdbFetch } from './client'
import { tmdbPosterUrl, tmdbBackdropUrl } from './config'

interface TmdbSearchPersonResponse {
  page: number
  results: Array<{
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
    popularity: number
  }>
}

interface TmdbCombinedCreditsResponse {
  cast: Array<{
    id: number
    title?: string
    name?: string
    original_title?: string
    original_name?: string
    media_type: 'movie' | 'tv'
    poster_path: string | null
    backdrop_path: string | null
    release_date?: string
    first_air_date?: string
    vote_average: number
    vote_count: number
    popularity: number
    character?: string
    genre_ids?: number[]
  }>
}

export interface PersonCreditMovie {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string
  backdropUrl: string
  releaseDate: string
  year: number
  voteAverage: number
  voteCount: number
  popularity: number
  genreIds: number[]
  genres: Array<{ id: number; name: string; slug: string }>
  runtime: number
  runtimeFormatted: string
  mediaType: 'movie' | 'tv'
  character: string
}

export interface PersonSearchResult {
  person: { id: number; name: string; knownFor: string; profilePath: string | null; popularity: number }
  credits: PersonCreditMovie[]
}

/**
 * Find a TMDB person by name and return their full filmography.
 * Returns `null` if no person matches (so callers can fall through to title search).
 *
 * The credits list is sorted by popularity desc with no upper limit. Callers
 * can paginate as needed.
 */
export async function searchTmdbPersonWithCredits(query: string): Promise<PersonSearchResult | null> {
  const q = query.trim()
  if (!q) return null

  let people: TmdbSearchPersonResponse
  try {
    people = await tmdbFetch<TmdbSearchPersonResponse>('/search/person', {
      params: { query: q, include_adult: 'false' },
      revalidate: 3600,
    })
  } catch {
    return null
  }

  // Pick the most popular match whose name appears to match the query.
  // TMDB's relevance ranking is already pretty good; we just trust position 0.
  const top = people.results[0]
  if (!top) return null

  let creditsRes: TmdbCombinedCreditsResponse
  try {
    creditsRes = await tmdbFetch<TmdbCombinedCreditsResponse>(`/person/${top.id}/combined_credits`, {
      revalidate: 3600,
    })
  } catch {
    return null
  }

  // Dedupe (cast list sometimes has duplicates for the same project) and sort by popularity.
  const seen = new Set<string>()
  const credits: PersonCreditMovie[] = []
  for (const c of creditsRes.cast || []) {
    const key = `${c.media_type}:${c.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const releaseDate = c.release_date || c.first_air_date || ''
    const year = releaseDate ? Number(releaseDate.slice(0, 4)) : 0
    credits.push({
      id: c.id,
      title: c.title || c.name || '',
      originalTitle: c.original_title || c.original_name || c.title || c.name || '',
      overview: '',
      posterUrl: c.poster_path ? tmdbPosterUrl(c.poster_path) : '',
      backdropUrl: c.backdrop_path ? tmdbBackdropUrl(c.backdrop_path) : '',
      releaseDate,
      year: Number.isFinite(year) ? year : 0,
      voteAverage: c.vote_average || 0,
      voteCount: c.vote_count || 0,
      popularity: c.popularity || 0,
      genreIds: c.genre_ids || [],
      genres: [],
      runtime: 0,
      runtimeFormatted: '',
      mediaType: c.media_type,
      character: c.character || '',
    })
  }

  credits.sort((a, b) => b.popularity - a.popularity)

  return {
    person: {
      id: top.id,
      name: top.name,
      knownFor: top.known_for_department,
      profilePath: top.profile_path,
      popularity: top.popularity,
    },
    credits,
  }
}
