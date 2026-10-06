// ============================================
// KKPhim → Prisma Data Mapper
// ============================================
// Maps raw KKPhim API responses to Prisma-compatible data structures.

import type {
  KKPhimMovieDetail,
  KKPhimEpisodeServer,
  MappedMovie,
  MappedEpisode,
} from './types'

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
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
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

const OPHIM_IMAGE_BASE = 'https://img.ophim.live/uploads/movies/'

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Relative path — prepend base
  return `${OPHIM_IMAGE_BASE}${url}`
}

// ─── Episode Total Parser ───────────────────────────────────────

function parseEpisodeTotal(total: string | number | null | undefined): number | null {
  if (!total) return null
  if (typeof total === 'number') return Number.isFinite(total) ? total : null
  // "50 Tập" → 50, "1" → 1, "?" → null
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

function detectStreamType(embedUrl: string | null, m3u8Url: string | null): string {
  if (m3u8Url && m3u8Url.includes('.m3u8')) return 'hls'
  if (embedUrl) return 'iframe'
  return 'mp4'
}

// ─── Episode Number Parser ──────────────────────────────────────

function parseEpisodeNumber(name: string): number {
  // "1" → 1, "01" → 1, "Full" → 1, "Tập 3" → 3
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
 * Map KKPhim movie detail → Prisma Movie upsert data
 */
export function mapMovie(raw: KKPhimMovieDetail): MappedMovie {
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
    thumbUrl: resolveImageUrl(raw.thumb_url),
    posterUrl: resolveImageUrl(raw.poster_url),
    isCopyright: raw.is_copyright || false,


    tmdbId: tmdbId && !isNaN(tmdbId) ? tmdbId : null,
    imdbId,
    metadataSource: 'ophim',
    sourceStatus: 'active',
  }
}

/**
 * Map KKPhim episode servers → flat list of Prisma Episode upsert data
 */
export function mapEpisodes(servers: KKPhimEpisodeServer[]): MappedEpisode[] {
  const episodes: MappedEpisode[] = []
  let globalOrder = 0

  for (const server of servers) {
    if (!server.server_data || !Array.isArray(server.server_data)) continue

    for (const ep of server.server_data) {
      if (!ep || !ep.slug) continue

      const epNumber = parseEpisodeNumber(ep.name || ep.slug)
      const streamType = detectStreamType(ep.link_embed, ep.link_m3u8)
      const streamUrl = ep.link_m3u8 || ep.link_embed || null
      const sourceUrl = ep.link_embed || null

      episodes.push({
        sourceName: 'KKPhim',
        serverName: server.server_name || 'Server #1',
        episodeName: ep.filename || `Tập ${ep.name}`,
        episodeSlug: `tap-${ep.slug}`,
        episodeNumber: epNumber,
        episodeOrder: globalOrder++,
        streamType,
        streamUrl,
        sourceUrl,
        status: streamUrl ? 'active' : 'pending',
        isActive: true,
      })
    }
  }

  return episodes
}

/**
 * Map KKPhim categories → Prisma Category upsert data
 */
export function mapCategories(raw: KKPhimMovieDetail): Array<{ name: string; slug: string }> {
  if (!raw.category || !Array.isArray(raw.category)) return []
  return raw.category
    .filter((c: { name: string; slug: string }) => c.name && c.slug)
    .map((c: { name: string; slug: string }) => ({ name: c.name.trim(), slug: c.slug.trim() }))
}

/**
 * Map KKPhim countries → Prisma Country upsert data
 */
export function mapCountries(raw: KKPhimMovieDetail): Array<{ name: string; slug: string }> {
  if (!raw.country || !Array.isArray(raw.country)) return []
  return raw.country
    .filter((c: { name: string; slug: string }) => c.name && c.slug)
    .map((c: { name: string; slug: string }) => ({ name: c.name.trim(), slug: c.slug.trim() }))
}
