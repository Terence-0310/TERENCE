// ============================================
// OPhim Source Adapter
// ============================================
// Normalizes raw OPhim data (any shape) into the unified
// PlayerSourceMap format for the HLS player.
//
// Handles:
//   A. { episodes: [{ server_name, server_data }] }      — OPhim v1 detail
//   B. { servers: [{ name, data }] }                     — Alternative OPhim shape
//   C. { movie: { episodes: [...] } }                    — Wrapped movie object
//   D. { data: { item: { episodes: [...] } } }           — OPhim18 v1/api detail
//   E. { item: { episodes: [...] } }                     — Partial OPhim18
//   F. Raw server array [ { server_name, server_data } ] — Direct array
//   G. DB-sourced EpisodePlaybackData                    — Playback service output
//
// All inputs are treated as `unknown` — no shape is assumed.
// Never throws. Always returns a safe { servers: [] } on failure.

import type { PlayerEpisode, PlayerServer, PlayerSourceMap } from './source-types'
import { EMPTY_SOURCE_MAP } from './source-types'
import { logger } from '@/src/fe/lib/logger'

const log = logger.child({ module: 'source-adapter' })

// ═══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

// ── Type guards ──

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function safeString(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  return ''
}

function coerceArray(v: unknown): unknown[] {
  if (isArray(v)) return v
  return []
}

// ── URL validation ──

/**
 * Check if a value is a valid, playable stream URL.
 * Accepts .m3u8 (HLS) and .mp4 URLs.
 */
export function isValidStreamUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check if a value is a valid .m3u8 HLS URL.
 */
export function isValidM3U8Url(value: unknown): value is string {
  if (!isValidStreamUrl(value)) return false
  try {
    const url = new URL(value)
    return url.pathname.endsWith('.m3u8')
  } catch {
    return false
  }
}

// ── Name normalization ──

/**
 * Normalize server name.
 * Trims, falls back to "Server {index}" if blank.
 */
function normalizeServerName(raw: unknown, index: number): string {
  const name = safeString(raw)
  if (name.length > 0) return name
  return `Server ${index + 1}`
}

/**
 * Normalize episode name.
 * Priority: name → episode_name → slug → "Tập {index}"
 */
function normalizeEpisodeName(record: Record<string, unknown>, index: number): string {
  // 1. "name" field (most common in OPhim)
  const name = safeString(record['name'])
  if (name.length > 0) {
    // If name is just a number like "1", "2", make it "Tập 1"
    if (/^\d+$/.test(name)) return `Tập ${name}`
    // If it already says "Tập" or "Full", use as-is
    return name
  }

  // 2. "episode_name" field
  const episodeName = safeString(record['episode_name'])
  if (episodeName.length > 0) return episodeName

  // 3. "filename" field (OPhim uses this for display)
  const filename = safeString(record['filename'])
  if (filename.length > 0) return filename

  // 4. Derive from "slug"
  const slug = safeString(record['slug'])
  if (slug.length > 0) {
    if (/^\d+$/.test(slug)) return `Tập ${slug}`
    if (slug.toLowerCase() === 'full') return 'Tập Full'
    return slug
  }

  // 5. Fallback
  return `Tập ${index + 1}`
}

/**
 * Normalize episode slug.
 * Ensures a URL-friendly slug exists.
 */
function normalizeEpisodeSlug(record: Record<string, unknown>, index: number): string {
  // Try "slug" field first
  const slug = safeString(record['slug'])
  if (slug.length > 0) {
    // OPhim often stores slug as just "1", "2" — prefix with "tap-"
    if (/^\d+$/.test(slug)) return `tap-${slug}`
    if (slug.toLowerCase() === 'full') return 'full'
    // If it already has "tap-" prefix, use as-is
    if (slug.startsWith('tap-')) return slug
    return slug
  }

  // Derive from name
  const name = safeString(record['name'])
  if (name.length > 0) {
    if (/^\d+$/.test(name)) return `tap-${name}`
    if (name.toLowerCase() === 'full') return 'full'
    return name.toLowerCase().replace(/\s+/g, '-')
  }

  return `tap-${index + 1}`
}

/**
 * Extract the best stream URL from an episode record.
 * Priority: link_m3u8 → url → link_embed (only if valid) → streamUrl
 */
function extractStreamUrl(record: Record<string, unknown>): string | null {
  // 1. link_m3u8 — canonical OPhim field for HLS
  const m3u8 = safeString(record['link_m3u8'])
  if (isValidStreamUrl(m3u8)) return m3u8

  // 2. "url" — generic field used in normalized data
  const url = safeString(record['url'])
  if (isValidStreamUrl(url)) return url

  // 3. "streamUrl" — DB legacy field
  const streamUrl = safeString(record['streamUrl'])
  if (isValidStreamUrl(streamUrl)) return streamUrl

  // 4. "link_embed" — only accept if it looks like a direct video URL, not an iframe
  const embed = safeString(record['link_embed'])
  if (isValidStreamUrl(embed) && !embed.includes('/embed') && !embed.includes('iframe')) {
    return embed
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// EPISODE LIST EXTRACTORS — parse different OPhim server shapes
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a single server object into a PlayerServer.
 * Handles two common episode-list field names:
 *   - "server_data" (OPhim v1 + v18)
 *   - "data" (alternative shape)
 *   - "items" (rare)
 */
function parseServerObject(serverObj: unknown, serverIndex: number): PlayerServer | null {
  if (!isRecord(serverObj)) return null

  // Resolve server name
  const serverName = normalizeServerName(
    serverObj['server_name'] || serverObj['name'],
    serverIndex,
  )

  // Resolve episode list from various field names
  const rawEpisodes = coerceArray(
    serverObj['server_data'] ?? serverObj['data'] ?? serverObj['items'] ?? serverObj['episodes'] ?? [],
  )

  const episodes: PlayerEpisode[] = []

  for (let i = 0; i < rawEpisodes.length; i++) {
    const ep = rawEpisodes[i]
    if (!isRecord(ep)) continue

    const url = extractStreamUrl(ep)
    if (!url) continue

    episodes.push({
      name: normalizeEpisodeName(ep, i),
      slug: normalizeEpisodeSlug(ep, i),
      url,
    })
  }

  if (episodes.length === 0) return null

  return { name: serverName, episodes }
}

// ═══════════════════════════════════════════════════════════════
// SHAPE RESOLVERS — find the server array in raw data
// ═══════════════════════════════════════════════════════════════

/**
 * Try to find an array of server objects from unknown input.
 * Traverses all known OPhim response shapes (A–F).
 */
function resolveServerArray(input: unknown): unknown[] {
  // Direct array of servers (Shape F)
  if (isArray(input)) return input

  if (!isRecord(input)) return []

  // Shape A: { episodes: [...] } — OPhim v1 top-level
  if (isArray(input['episodes'])) {
    // But only if the first element looks like a server (has server_name or server_data)
    const first = input['episodes'][0]
    if (isRecord(first) && ('server_name' in first || 'server_data' in first || 'data' in first)) {
      return input['episodes'] as unknown[]
    }
    // Could be a plain episodes array — wrap in a single server
    return [{ server_name: 'Server 1', server_data: input['episodes'] }]
  }

  // Shape B: { servers: [...] }
  if (isArray(input['servers'])) {
    return input['servers'] as unknown[]
  }

  // Shape C: { movie: { episodes: [...] } }
  if (isRecord(input['movie'])) {
    return resolveServerArray(input['movie'])
  }

  // Shape D: { data: { item: { episodes: [...] } } } — OPhim18 full detail
  if (isRecord(input['data'])) {
    const data = input['data'] as Record<string, unknown>
    if (isRecord(data['item'])) {
      return resolveServerArray(data['item'])
    }
    // Maybe data directly has episodes/servers
    return resolveServerArray(data)
  }

  // Shape E: { item: { episodes: [...] } }
  if (isRecord(input['item'])) {
    return resolveServerArray(input['item'])
  }

  return []
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize any OPhim-shaped data into a unified PlayerSourceMap.
 *
 * Accepts `unknown` and handles every known shape:
 *   - OPhim v1 detail response
 *   - OPhim18 v1/api detail response
 *   - Raw server arrays
 *   - Wrapped objects (movie/data/item)
 *   - Already normalized data
 *
 * Never throws. Returns `{ servers: [] }` if nothing is parseable.
 *
 * @example
 * ```ts
 * const sourceMap = mapOPhimToPlayerSources(ophimDetailResponse)
 * const { servers } = sourceMap
 * // servers is guaranteed to be PlayerServer[]
 * ```
 */
export function mapOPhimToPlayerSources(input: unknown): PlayerSourceMap {
  try {
    const rawServers = resolveServerArray(input)

    if (rawServers.length === 0) return EMPTY_SOURCE_MAP

    const servers: PlayerServer[] = []
    const seenUrls = new Set<string>() // deduplicate across all servers

    for (let i = 0; i < rawServers.length; i++) {
      const parsed = parseServerObject(rawServers[i], i)
      if (!parsed) continue

      // Deduplicate episodes across servers
      const uniqueEpisodes = parsed.episodes.filter((ep) => {
        if (seenUrls.has(ep.url)) return false
        seenUrls.add(ep.url)
        return true
      })

      if (uniqueEpisodes.length > 0) {
        servers.push({ name: parsed.name, episodes: uniqueEpisodes })
      }
    }

    if (servers.length === 0) return EMPTY_SOURCE_MAP

    return { servers }
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : e }, 'Failed to parse input')
    return EMPTY_SOURCE_MAP
  }
}

/**
 * Find the default server index — first server that has at least one episode.
 *
 * @returns Index of the first valid server, or 0 if no servers exist.
 */
export function getDefaultServerIndex(servers: PlayerServer[]): number {
  if (!isArray(servers) || servers.length === 0) return 0

  for (let i = 0; i < servers.length; i++) {
    if (servers[i].episodes && servers[i].episodes.length > 0) {
      return i
    }
  }

  return 0
}

/**
 * Find the default episode index within a given server.
 *
 * Logic:
 * 1. If `preferredEpisodeSlug` matches an episode in any server → return that index
 * 2. If not found → return 0 (first episode)
 * 3. If server has no episodes → try next server with episodes
 * 4. Never crashes on empty/invalid input
 *
 * @param servers Full server list
 * @param preferredEpisodeSlug Optional slug to match (e.g. "tap-1")
 * @returns `{ serverIndex, episodeIndex }` tuple
 */
export function getDefaultEpisodeIndex(
  servers: PlayerServer[],
  preferredEpisodeSlug?: string,
): { serverIndex: number; episodeIndex: number } {
  if (!isArray(servers) || servers.length === 0) {
    return { serverIndex: 0, episodeIndex: 0 }
  }

  // If a preferred slug is given, find it across all servers
  if (preferredEpisodeSlug) {
    const normalizedSlug = preferredEpisodeSlug.trim().toLowerCase()

    for (let sIdx = 0; sIdx < servers.length; sIdx++) {
      const episodes = servers[sIdx]?.episodes
      if (!isArray(episodes)) continue

      for (let eIdx = 0; eIdx < episodes.length; eIdx++) {
        const epSlug = (episodes[eIdx]?.slug || '').toLowerCase()
        if (epSlug === normalizedSlug) {
          return { serverIndex: sIdx, episodeIndex: eIdx }
        }
      }
    }
  }

  // No match — return first server that has episodes
  for (let sIdx = 0; sIdx < servers.length; sIdx++) {
    if (servers[sIdx]?.episodes?.length > 0) {
      return { serverIndex: sIdx, episodeIndex: 0 }
    }
  }

  return { serverIndex: 0, episodeIndex: 0 }
}

/**
 * Map a DB-sourced EpisodePlaybackData + additionalServers into PlayerSourceMap.
 *
 * This bridges the `playback-service.ts` output (which uses `PlayableSource[]`)
 * to the unified adapter format. Use this in WatchPageClient instead of
 * manually building servers.
 *
 * @param episodeData Playback data from `getMoviePlaybackData`
 * @param additionalServers Extra servers from `getMultiServerSources`
 */
export function mapDbPlaybackToPlayerSources(
  episodeData: unknown,
  additionalServers?: unknown,
): PlayerSourceMap {
  if (!isRecord(episodeData)) return EMPTY_SOURCE_MAP

  const servers: PlayerServer[] = []
  const seenUrls = new Set<string>()

  // ── Parse episode object ──
  const episode = isRecord(episodeData['episode']) ? episodeData['episode'] : null
  const epName = episode
    ? (safeString(episode['episodeName']) || `Tập ${safeString(episode['episodeNumber']) || '1'}`)
    : 'Tập 1'
  const epSlug = episode
    ? (safeString(episode['episodeSlug']) || `tap-${safeString(episode['episodeNumber']) || '1'}`)
    : 'tap-1'

  // ── Build servers from PlayableSource[] ──
  const sources = coerceArray(episodeData['sources'])

  if (sources.length > 0) {
    const hlsMp4Sources = sources.filter((s) => {
      if (!isRecord(s)) return false
      const type = safeString(s['sourceType'])
      return type === 'hls' || type === 'mp4'
    })

    const hasUniqueLabels = new Set(
      hlsMp4Sources.map((s) => isRecord(s) ? safeString(s['label']) : ''),
    ).size === hlsMp4Sources.length

    hlsMp4Sources.forEach((src, idx) => {
      if (!isRecord(src)) return
      const url = safeString(src['url'])
      if (!isValidStreamUrl(url) || seenUrls.has(url)) return
      seenUrls.add(url)

      const serverName = hasUniqueLabels
        ? (safeString(src['label']) || `Server ${idx + 1}`)
        : `Server ${idx + 1}${src['isPrimary'] ? ' (Chính)' : ''}`

      servers.push({
        name: serverName,
        episodes: [{ name: epName, slug: epSlug, url }],
      })
    })
  }

  // ── Fallback to primarySource ──
  if (servers.length === 0 && isRecord(episodeData['primarySource'])) {
    const ps = episodeData['primarySource']
    const url = safeString(ps['url'])
    if (isValidStreamUrl(url)) {
      seenUrls.add(url)
      servers.push({
        name: 'Server 1',
        episodes: [{ name: epName, slug: epSlug, url }],
      })
    }
  }

  // ── Append additional servers ──
  if (isArray(additionalServers)) {
    for (let i = 0; i < additionalServers.length; i++) {
      const extra = additionalServers[i]
      if (!isRecord(extra)) continue

      const name = safeString(extra['name']) || `Server ${servers.length + 1}`
      const rawEps = coerceArray(extra['episodes'])
      const filtered: PlayerEpisode[] = []

      for (let j = 0; j < rawEps.length; j++) {
        const ep = rawEps[j]
        if (!isRecord(ep)) continue
        const url = safeString(ep['url'])
        if (!isValidStreamUrl(url) || seenUrls.has(url)) continue
        seenUrls.add(url)
        filtered.push({
          name: safeString(ep['name']) || epName,
          slug: safeString(ep['slug']) || epSlug,
          url,
        })
      }

      if (filtered.length > 0) {
        servers.push({ name, episodes: filtered })
      }
    }
  }

  if (servers.length === 0) return EMPTY_SOURCE_MAP

  return { servers }
}
