// ============================================
// OPhim18 → Prisma Data Mapper
// ============================================
// Maps raw OPhim18 v1/api responses to Prisma-compatible data structures.
// Key difference from old API: images are relative paths, needs APP_DOMAIN_CDN_IMAGE prefix.

import type {
  OPhim18MovieItem,
  OPhim18EpisodeServer,
  MappedMovie,
  MappedEpisode,
  MappedCategory,
  MappedCountry,
} from './ophim18-types'

// ─── Content Type Mapping ───────────────────────────────────────

const CONTENT_TYPE_MAP: Record<string, string> = {
  'movie': 'movie',
  'single': 'movie',
  'series': 'series',
  'hoathinh': 'anime',
  'tvshows': 'series',
  'trailer': 'trailer',
}

function mapContentType(ophimType: string): string {
  return CONTENT_TYPE_MAP[ophimType?.toLowerCase()] || 'movie'
}

// ─── Status Mapping ─────────────────────────────────────────────

function mapStatus(ophimStatus: string): string {
  switch (ophimStatus?.toLowerCase()) {
    case 'completed': return 'published'
    case 'ongoing': return 'published'
    case 'trailer': return 'draft'
    default: return 'draft'
  }
}

// ─── Text Sanitization ──────────────────────────────────────────

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim() || null
}

function cleanString(str: string | null | undefined): string | null {
  if (!str || str.trim() === '') return null
  return str.trim()
}

// ─── Image URL Resolution ───────────────────────────────────────

const DEFAULT_CDN_IMAGE = 'https://img.ophim.live'

/**
 * Resolve image URL from OPhim18 v1/api format.
 * Images come as relative paths (e.g. "cong-thuc-tinh-yeu-thumb.jpg")
 * and need to be prepended with APP_DOMAIN_CDN_IMAGE + /uploads/movies/
 */
export function resolveImageUrl(
  url: string | null | undefined,
  cdnBase: string = DEFAULT_CDN_IMAGE
): string | null {
  if (!url || url.trim() === '') return null
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Relative path — prepend CDN base + upload path
  const base = cdnBase.replace(/\/$/, '')
  return `${base}/uploads/movies/${url}`
}

// ─── Episode Total Parser ───────────────────────────────────────

function parseEpisodeTotal(total: string | null | undefined): number | null {
  if (!total) return null
  const match = total.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// ─── Language Mapping ───────────────────────────────────────────

function mapLanguage(lang: string | null | undefined): string | null {
  if (!lang) return null
  const lower = lang.toLowerCase()
  if (lower.includes('vietsub') || lower.includes('phụ đề')) return 'Vietsub'
  if (lower.includes('thuyết minh') || lower.includes('thuyetminh')) return 'Thuyết Minh'
  if (lower.includes('lồng tiếng') || lower.includes('longtieng')) return 'Lồng Tiếng'
  if (lower.includes('eng')) return 'Engsub'
  return lang.trim()
}

// ─── Stream Type Detection ──────────────────────────────────────

/**
 * Standardize stream type based on URL patterns.
 * Returns: m3u8 | embed | mp4 | other
 */
function detectStreamType(linkEmbed: string | null, linkM3u8: string | null): string {
  if (linkM3u8 && linkM3u8.trim() !== '' && linkM3u8.includes('.m3u8')) return 'm3u8'
  if (linkEmbed && linkEmbed.trim() !== '') return 'embed'
  return 'other'
}

/**
 * Pick the best stream URL: prefer m3u8 > embed > null
 */
function pickStreamUrl(linkEmbed: string | null, linkM3u8: string | null): string | null {
  if (linkM3u8 && linkM3u8.trim() !== '' && linkM3u8.includes('.m3u8')) return linkM3u8.trim()
  if (linkEmbed && linkEmbed.trim() !== '') return linkEmbed.trim()
  return null
}

// ─── Episode Number Parser ──────────────────────────────────────

function parseEpisodeNumber(name: string): number {
  const num = parseInt(name, 10)
  if (!isNaN(num) && num > 0) return num
  const match = name.match(/(\d+)/)
  if (match) return parseInt(match[1], 10)
  return 1
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC MAPPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Map OPhim18 movie item → Prisma Movie upsert data
 */
export function mapMovie(raw: OPhim18MovieItem, cdnBase?: string): MappedMovie {
  const cdn = cdnBase || DEFAULT_CDN_IMAGE
  const tmdbId = raw.tmdb?.id ? parseInt(raw.tmdb.id, 10) : null
  const imdbId = raw.imdb?.id && raw.imdb.id.startsWith('tt') ? raw.imdb.id : null

  return {
    ophimId: raw._id,
    slug: raw.slug,
    title: raw.name || raw.origin_name || 'Untitled',
    originalTitle: cleanString(raw.origin_name),
    description: stripHtml(raw.content),
    contentType: mapContentType(raw.type),
    status: mapStatus(raw.status),
    quality: cleanString(raw.quality),
    language: mapLanguage(raw.lang),
    year: raw.year || null,
    episodeCurrent: cleanString(raw.episode_current),
    episodeTotal: parseEpisodeTotal(raw.episode_total),
    trailerUrl: cleanString(raw.trailer_url),
    thumbUrl: resolveImageUrl(raw.thumb_url, cdn),
    posterUrl: resolveImageUrl(raw.poster_url, cdn),
    isCopyright: raw.is_copyright || false,


    tmdbId: tmdbId && !isNaN(tmdbId) ? tmdbId : null,
    imdbId,
    metadataSource: 'ophim18',
    sourceStatus: 'active',
  }
}

/**
 * Map OPhim18 episode servers → flat list of Prisma Episode upsert data
 */
export function mapEpisodes(servers: OPhim18EpisodeServer[]): MappedEpisode[] {
  const episodes: MappedEpisode[] = []
  let globalOrder = 0

  for (const server of servers) {
    if (!server.server_data || !Array.isArray(server.server_data)) continue

    for (const ep of server.server_data) {
      if (!ep || !ep.slug) continue

      const streamType = detectStreamType(ep.link_embed, ep.link_m3u8)
      const streamUrl = pickStreamUrl(ep.link_embed, ep.link_m3u8)
      const sourceUrl = ep.link_embed && ep.link_embed.trim() !== '' ? ep.link_embed.trim() : null

      episodes.push({
        sourceName: 'ophim18',
        serverName: server.server_name || 'Server #1',
        episodeName: ep.filename || `Tập ${ep.name}`,
        episodeSlug: `tap-${ep.slug}`,
        episodeNumber: parseEpisodeNumber(ep.name || ep.slug),
        episodeOrder: globalOrder++,
        streamType,
        streamUrl,
        sourceUrl,
        status: streamUrl ? 'active' : 'pending',
        isActive: !!streamUrl,
      })
    }
  }

  return episodes
}

/**
 * Map OPhim18 categories → Prisma Category upsert data
 */
export function mapCategories(raw: OPhim18MovieItem): MappedCategory[] {
  if (!raw.category || !Array.isArray(raw.category)) return []
  return raw.category
    .filter(c => c.name && c.slug)
    .map(c => ({ name: c.name.trim(), slug: c.slug.trim() }))
}

/**
 * Map OPhim18 countries → Prisma Country upsert data
 */
export function mapCountries(raw: OPhim18MovieItem): MappedCountry[] {
  if (!raw.country || !Array.isArray(raw.country)) return []
  return raw.country
    .filter(c => c.name && c.slug)
    .map(c => ({ name: c.name.trim(), slug: c.slug.trim() }))
}
