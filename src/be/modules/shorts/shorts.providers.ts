// ============================================
// Shorts — content providers
// ============================================
// Each provider turns one catalog movie into candidate shorts.
//
//   • TMDB   (default, uses TMDB_READ_ACCESS_TOKEN / TMDB_API_KEY):
//            official clips, teasers, trailers, featurettes (YouTube, 16:9).
//   • YouTube (optional, needs YOUTUBE_API_KEY): real vertical #shorts found
//            by searching "<title> #shorts" with videoDuration=short.
//   • Catalog (always on, no API): the YouTube trailer already stored on the
//            movie (Movie.trailerKey from OPhim/KKPhim sync).

import { getVideosMultiLanguage } from '@/src/be/modules/tmdb/tmdb-client'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'shorts-providers' })

export interface ProviderMovie {
  id: string
  trailerKey?: string | null
  trailerSite?: string | null
  title: string
  originalTitle: string | null
  year: number | null
  tmdbId: number | null
  contentType: string
  genres: string[]
}

export interface ShortCandidate {
  externalId: string
  source: 'tmdb' | 'youtube' | 'catalog'
  videoType: 'youtube'
  videoUrl: string
  title: string
  description: string | null
  hashtags: string | null
  thumbnailUrl: string
  orientation: 'portrait' | 'landscape'
  language: string | null
  publishedAt: Date
}

export function youtubeThumbnail(key: string): string {
  return `https://i.ytimg.com/vi/${key}/hqdefault.jpg`
}

/** Build hashtags like "hoamau kinhdi phimbo" from title + genres. */
export function buildHashtags(movie: ProviderMovie): string {
  const toTag = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const tags = [movie.title, ...movie.genres.slice(0, 2), movie.contentType === 'movie' ? 'phimle' : 'phimbo', 'terence']
    .map(toTag)
    .filter((t) => t.length > 1 && t.length <= 30)
  return Array.from(new Set(tags)).join(' ')
}

// ─── TMDB ───────────────────────────────────────────────────────

const TMDB_TYPE_LABEL: Record<string, string> = {
  Clip: 'Clip',
  Teaser: 'Teaser',
  Trailer: 'Trailer',
  Featurette: 'Hậu trường',
  'Behind the Scenes': 'Hậu trường',
  Bloopers: 'Cảnh hậu trường vui',
}
// Shorter, punchier formats first — that's what a shorts feed wants.
const TMDB_TYPE_PRIORITY = ['Clip', 'Teaser', 'Bloopers', 'Featurette', 'Behind the Scenes', 'Trailer']

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY)
}

export async function fetchTmdbShorts(movie: ProviderMovie, maxPerMovie = 3): Promise<ShortCandidate[]> {
  if (!movie.tmdbId || !isTmdbConfigured()) return []
  const mediaType = movie.contentType === 'movie' ? 'movie' : 'tv'
  let results
  try {
    results = (await getVideosMultiLanguage(movie.tmdbId, mediaType)).results
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err, tmdbId: movie.tmdbId }, 'TMDB videos fetch failed')
    return []
  }

  const hashtags = buildHashtags(movie)
  return results
    .filter((v) => v.site === 'YouTube' && TMDB_TYPE_PRIORITY.includes(v.type))
    .sort((a, b) =>
      // Vietnamese first, then by format priority, then official.
      Number(b.iso_639_1 === 'vi') - Number(a.iso_639_1 === 'vi') ||
      TMDB_TYPE_PRIORITY.indexOf(a.type) - TMDB_TYPE_PRIORITY.indexOf(b.type) ||
      Number(b.official) - Number(a.official),
    )
    .slice(0, maxPerMovie)
    .map((v) => ({
      externalId: `yt:${v.key}`,
      source: 'tmdb' as const,
      videoType: 'youtube' as const,
      videoUrl: v.key,
      title: `${movie.title} — ${TMDB_TYPE_LABEL[v.type] ?? v.type}`,
      description: v.name,
      hashtags,
      thumbnailUrl: youtubeThumbnail(v.key),
      orientation: 'landscape' as const,
      language: v.iso_639_1 || null,
      publishedAt: v.published_at ? new Date(v.published_at) : new Date(),
    }))
}

// ─── YouTube Data API v3 ────────────────────────────────────────

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY)
}

interface YouTubeSearchItem {
  id: { videoId?: string }
  snippet: { title: string; description: string; publishedAt: string; defaultAudioLanguage?: string }
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

/**
 * Search YouTube for vertical #shorts about a movie. Each call costs 100 quota
 * units (default quota 10,000/day ≈ 100 movies/day).
 */
export async function fetchYouTubeShorts(movie: ProviderMovie, maxPerMovie = 3): Promise<ShortCandidate[]> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return []

  const q = `${movie.title}${movie.year ? ` ${movie.year}` : ''} #shorts`
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoDuration: 'short',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    regionCode: process.env.NEXT_PUBLIC_REGION || 'VN',
    relevanceLanguage: 'vi',
    maxResults: String(Math.min(maxPerMovie * 2, 10)),
    q,
    key,
  })

  let items: YouTubeSearchItem[] = []
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      log.warn({ status: res.status, movie: movie.title }, 'YouTube search failed')
      return []
    }
    items = ((await res.json()) as { items?: YouTubeSearchItem[] }).items ?? []
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err }, 'YouTube search error')
    return []
  }

  // Keep results that actually mention the title, to avoid unrelated shorts.
  const needle = movie.title.toLowerCase().split(/\s+/).slice(0, 2).join(' ')
  const hashtags = buildHashtags(movie)
  return items
    .filter((it) => it.id.videoId && decodeEntities(it.snippet.title).toLowerCase().includes(needle))
    .slice(0, maxPerMovie)
    .map((it) => ({
      externalId: `yt:${it.id.videoId}`,
      source: 'youtube' as const,
      videoType: 'youtube' as const,
      videoUrl: it.id.videoId!,
      title: decodeEntities(it.snippet.title).slice(0, 200),
      description: decodeEntities(it.snippet.description).slice(0, 500) || null,
      hashtags,
      thumbnailUrl: youtubeThumbnail(it.id.videoId!),
      orientation: 'portrait' as const,
      language: it.snippet.defaultAudioLanguage || null,
      publishedAt: new Date(it.snippet.publishedAt),
    }))
}

// ─── Catalog trailer ────────────────────────────────────────────

export function catalogTrailerShort(movie: ProviderMovie): ShortCandidate[] {
  const key = movie.trailerKey ? parseYouTubeId(movie.trailerKey) : null
  if (!key || (movie.trailerSite && !/youtube/i.test(movie.trailerSite))) return []
  return [{
    externalId: `yt:${key}`,
    source: 'catalog',
    videoType: 'youtube',
    videoUrl: key,
    title: `${movie.title} — Trailer`,
    description: movie.originalTitle && movie.originalTitle !== movie.title ? movie.originalTitle : null,
    hashtags: buildHashtags(movie),
    thumbnailUrl: youtubeThumbnail(key),
    orientation: 'landscape',
    language: null,
    publishedAt: new Date(),
  }]
}

// ─── Embeddability ──────────────────────────────────────────────

/**
 * Ask YouTube's public oEmbed endpoint (no API key) whether a video can be
 * embedded: 200 = yes, 401/403 = owner disabled embedding, 404 = removed.
 * Returns null when YouTube can't be reached, so callers keep the video.
 */
export async function isYouTubeEmbeddable(key: string): Promise<boolean | null> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${key}`)}`
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8_000) })
    if (res.ok) return true
    if ([400, 401, 403, 404].includes(res.status)) return false
    return null
  } catch {
    return null
  }
}

// ─── Admin input helpers ────────────────────────────────────────

/** Extract an 11-char YouTube id from a URL (watch, youtu.be, shorts, embed) or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
