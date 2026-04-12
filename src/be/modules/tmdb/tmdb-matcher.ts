// ============================================
// TMDB Matcher
// ============================================
// Multi-strategy title matching with confidence scoring.
// Strategies (in priority order):
//   1. OPhim pre-filled tmdbId (from ophim API) → confidence 0.90
//   2. originalTitle + year (exact) → confidence 0.95
//   3. title + year (exact) → confidence 0.85
//   4. originalTitle only (no year) → confidence 0.70
//   5. Normalized fuzzy match → confidence based on similarity

import { searchMovies, searchTv } from './tmdb-client'
import type { TmdbSearchMovieResult, TmdbSearchTvResult, MatchResult } from './types'

// Minimum confidence to auto-bind
export const MIN_AUTO_BIND_CONFIDENCE = 0.65

// ─── Text Normalization ─────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')       // strip special chars
    .replace(/\s+/g, ' ')
    .trim()
}

/** Jaro-Winkler-like similarity (simplified) */
function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (!na || !nb) return 0.0

  // Check containment
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length)
    const longer = Math.max(na.length, nb.length)
    return 0.7 + 0.3 * (shorter / longer)
  }

  // Token-based similarity (Jaccard on words)
  const tokensA = new Set(na.split(' '))
  const tokensB = new Set(nb.split(' '))
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size
  return union > 0 ? intersection / union : 0
}

// ─── Year Extraction ────────────────────────────────────────────

function extractYear(dateString: string | null | undefined): number | null {
  if (!dateString) return null
  const match = dateString.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : null
}

// ─── Matching Logic ─────────────────────────────────────────────

interface MovieToMatch {
  title: string
  originalTitle: string | null
  year: number | null
  contentType: string           // movie | series | anime
  ophimTmdbId: number | null    // pre-filled tmdbId from OPhim
}

function determineMediaType(contentType: string): 'movie' | 'tv' {
  if (contentType === 'movie') return 'movie'
  return 'tv' // series, anime → tv
}

/** Score a single candidate against our movie */
function scoreMovieCandidate(movie: MovieToMatch, candidate: TmdbSearchMovieResult): { score: number; method: string } {
  const candYear = extractYear(candidate.release_date)
  let bestScore = 0
  let method = 'none'

  // Strategy 1: originalTitle + year
  if (movie.originalTitle) {
    const sim = similarity(movie.originalTitle, candidate.original_title)
    if (sim > 0.8 && movie.year && candYear === movie.year) {
      const score = 0.95 * sim
      if (score > bestScore) { bestScore = score; method = 'originalTitle+year' }
    }
    // originalTitle only
    if (sim > 0.8) {
      const score = 0.70 * sim
      if (score > bestScore) { bestScore = score; method = 'originalTitle' }
    }
  }

  // Strategy 2: title + year
  const titleSim = Math.max(
    similarity(movie.title, candidate.title),
    similarity(movie.title, candidate.original_title)
  )
  if (titleSim > 0.7 && movie.year && candYear === movie.year) {
    const score = 0.85 * titleSim
    if (score > bestScore) { bestScore = score; method = 'title+year' }
  }

  // Strategy 3: title only (normalized)
  if (titleSim > 0.7) {
    const score = 0.65 * titleSim
    if (score > bestScore) { bestScore = score; method = 'normalized' }
  }

  return { score: bestScore, method }
}

function scoreTvCandidate(movie: MovieToMatch, candidate: TmdbSearchTvResult): { score: number; method: string } {
  const candYear = extractYear(candidate.first_air_date)
  let bestScore = 0
  let method = 'none'

  if (movie.originalTitle) {
    const sim = similarity(movie.originalTitle, candidate.original_name)
    if (sim > 0.8 && movie.year && candYear === movie.year) {
      const score = 0.95 * sim
      if (score > bestScore) { bestScore = score; method = 'originalTitle+year' }
    }
    if (sim > 0.8) {
      const score = 0.70 * sim
      if (score > bestScore) { bestScore = score; method = 'originalTitle' }
    }
  }

  const titleSim = Math.max(
    similarity(movie.title, candidate.name),
    similarity(movie.title, candidate.original_name)
  )
  if (titleSim > 0.7 && movie.year && candYear === movie.year) {
    const score = 0.85 * titleSim
    if (score > bestScore) { bestScore = score; method = 'title+year' }
  }
  if (titleSim > 0.7) {
    const score = 0.65 * titleSim
    if (score > bestScore) { bestScore = score; method = 'normalized' }
  }

  return { score: bestScore, method }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Match a movie to TMDB using multi-strategy approach.
 * Returns the best match with confidence score, or null if no good match.
 */
export async function matchMovie(movie: MovieToMatch): Promise<MatchResult | null> {
  const mediaType = determineMediaType(movie.contentType)

  // Strategy 0: Use OPhim pre-filled tmdbId if available
  if (movie.ophimTmdbId && movie.ophimTmdbId > 0) {
    return {
      tmdbId: movie.ophimTmdbId,
      mediaType,
      title: movie.title,
      originalTitle: movie.originalTitle || movie.title,
      year: movie.year,
      confidence: 0.90,
      matchMethod: 'ophim_tmdb_id',
    }
  }

  // Search TMDB
  const queries: string[] = []
  if (movie.originalTitle) queries.push(movie.originalTitle)
  if (movie.title !== movie.originalTitle) queries.push(movie.title)

  let bestMatch: MatchResult | null = null

  for (const query of queries) {
    try {
      if (mediaType === 'movie') {
        // Search as movie
        const res = await searchMovies(query, movie.year || undefined)
        for (const cand of res.results.slice(0, 5)) {
          const { score, method } = scoreMovieCandidate(movie, cand)
          if (score > (bestMatch?.confidence || 0)) {
            bestMatch = {
              tmdbId: cand.id,
              mediaType: 'movie',
              title: cand.title,
              originalTitle: cand.original_title,
              year: extractYear(cand.release_date),
              confidence: Math.round(score * 100) / 100,
              matchMethod: method,
            }
          }
        }
      } else {
        // Search as TV
        const res = await searchTv(query, movie.year || undefined)
        for (const cand of res.results.slice(0, 5)) {
          const { score, method } = scoreTvCandidate(movie, cand)
          if (score > (bestMatch?.confidence || 0)) {
            bestMatch = {
              tmdbId: cand.id,
              mediaType: 'tv',
              title: cand.name,
              originalTitle: cand.original_name,
              year: extractYear(cand.first_air_date),
              confidence: Math.round(score * 100) / 100,
              matchMethod: method,
            }
          }
        }
      }

      // Also try cross-type search if contentType is anime (could be movie or tv)
      if (movie.contentType === 'anime') {
        const crossRes = await searchMovies(query, movie.year || undefined)
        for (const cand of crossRes.results.slice(0, 3)) {
          const { score, method } = scoreMovieCandidate(movie, cand)
          if (score > (bestMatch?.confidence || 0)) {
            bestMatch = {
              tmdbId: cand.id,
              mediaType: 'movie',
              title: cand.title,
              originalTitle: cand.original_title,
              year: extractYear(cand.release_date),
              confidence: Math.round(score * 100) / 100,
              matchMethod: method + '_cross',
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[TMDB Matcher] Search failed for "${query}":`, error instanceof Error ? error.message : error)
    }
  }

  return bestMatch
}
