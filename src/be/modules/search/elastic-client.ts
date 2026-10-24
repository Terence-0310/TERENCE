// ============================================
// Elasticsearch Client Singleton
// ============================================
// Resilient ES client with graceful fallback when ES is unavailable.

import { Client } from '@elastic/elasticsearch'

const DEFAULT_HOST = 'http://localhost:9200'
const DEFAULT_INDEX = 'terence_movies'

let _client: Client | null = null
let _available: boolean | null = null // null = not checked yet

function getConfig() {
  return {
    host: process.env.ELASTICSEARCH_HOST || DEFAULT_HOST,
    index: process.env.ELASTICSEARCH_INDEX_MOVIES || DEFAULT_INDEX,
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
  }
}

/**
 * Get the Elasticsearch client singleton.
 * Creates a new client on first call.
 */
export function getClient(): Client {
  if (!_client) {
    const { host, username, password, apiKey } = getConfig()
    const auth = apiKey ? { apiKey } : (username && password ? { username, password } : undefined)

    _client = new Client({
      node: host,
      auth,
      // Fail fast: a dead ES must not make every search hang before
      // falling back to Prisma. One attempt, 5s cap.
      requestTimeout: 5000,
      maxRetries: 0,
      sniffOnStart: false,
    })
  }
  return _client
}

/**
 * Get the movies index name from env.
 */
export function getMoviesIndex(): string {
  return getConfig().index
}

/**
 * Check if Elasticsearch is available.
 *
 * Asymmetric caching to fix the "works sometimes, dumb sometimes" problem:
 *   - A HEALTHY result is cached 60s → no ping spam on every search.
 *   - A FAILED result is cached only 5s → a transient blip (GC pause, brief
 *     network hiccup) no longer blackballs ES for a whole minute and silently
 *     downgrades every search to the weaker Prisma LIKE fallback; ES is
 *     re-probed 5s later and search snaps back to full quality.
 *
 * The probe itself uses a 2s no-retry timeout so detecting a dead ES is cheap
 * and never adds latency to the search request that triggered the check.
 */
let _lastCheck = 0
const POSITIVE_TTL = 60_000
const NEGATIVE_TTL = 5_000

export async function isAvailable(): Promise<boolean> {
  const now = Date.now()
  const ttl = _available ? POSITIVE_TTL : NEGATIVE_TTL
  if (_available !== null && now - _lastCheck < ttl) return _available

  try {
    // Short, no-retry ping so detecting a dead ES costs ~2s, not ~10s.
    // searchMovies() gates on this, so a slow ping would slow every search.
    await getClient().ping({}, { requestTimeout: 2000, maxRetries: 0 })
    _available = true
  } catch {
    _available = false
  }
  _lastCheck = now
  return _available
}

/**
 * Elastic Cloud Serverless rejects cluster-level APIs (_cluster/health,
 * _stats) and shard/replica index settings. Detected once from
 * `GET /` (`version.build_flavor === 'serverless'`) and cached.
 */
let _serverless: boolean | null = null

export async function isServerless(): Promise<boolean> {
  if (_serverless === null) {
    const info = await getClient().info()
    _serverless = info.version?.build_flavor === 'serverless'
  }
  return _serverless
}

/** Index definition for this deployment: serverless manages shards itself. */
export function moviesIndexDefinition(serverless: boolean) {
  if (!serverless) return MOVIES_INDEX_MAPPING
  const { number_of_shards: _shards, number_of_replicas: _replicas, ...settings } = MOVIES_INDEX_MAPPING.settings
  return { ...MOVIES_INDEX_MAPPING, settings }
}

/**
 * Circuit-breaker hook: callers that actually hit ES and get an error report
 * it here so subsequent requests skip ES (fast Prisma fallback) for NEGATIVE_TTL
 * instead of each one paying the full request timeout. Re-probed after 5s.
 */
export function reportUnavailable() {
  _available = false
  _lastCheck = Date.now()
}

/**
 * Force re-check availability (e.g. after config change).
 */
export function resetAvailability() {
  _available = null
  _lastCheck = 0
}

/**
 * Close the client connection.
 */
export async function closeClient() {
  if (_client) {
    await _client.close()
    _client = null
    _available = null
  }
}

// ─── Index Mapping ──────────────────────────────────────────────

/**
 * Movies index mapping.
 *
 * Design notes:
 *   - Every Vietnamese-bearing field also has an `*Ascii` sibling holding
 *     the diacritics-stripped form. ES `asciifolding` alone gives us
 *     "people will find người" if they type "nguoi", but the explicit
 *     keyword + text pair lets the search query do tier-based scoring
 *     (exact ASCII match boost 90 vs analysed match boost 60, etc.).
 *   - `.keyword` sub-fields exist on every short text field so we can do
 *     case-insensitive exact match (via `term` on the keyword + normalised
 *     query).
 *   - `description` has NO ASCII sibling — we already de-prioritise it
 *     with boost 3, an ASCII variant would waste shard size.
 */
export const MOVIES_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        // Standard tokenizer + lowercase + asciifolding gives us
        // "nguoi nhen" tokens for "Người Nhện" — Vietnamese-friendly
        // without needing the (paid) ICU plugin.
        vietnamese_analyzer: {
          type: 'custom' as const,
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
        // Lowercase-only — preserves diacritics for the `_keyword` sibling
        // case-insensitive comparison (used in fielded keyword term queries).
        lowercase_keyword: {
          type: 'custom' as const,
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
        // Edge n-gram for autocomplete *Suggest fields.
        autocomplete_analyzer: {
          type: 'custom' as const,
          tokenizer: 'autocomplete_tokenizer',
          filter: ['lowercase', 'asciifolding'],
        },
        autocomplete_search_analyzer: {
          type: 'custom' as const,
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram' as const,
          min_gram: 1,
          max_gram: 20,
          token_chars: ['letter' as const, 'digit' as const],
        },
      },
      normalizer: {
        // Lowercase-only normaliser for `*Ascii` keyword fields — values
        // are already ASCII-folded at index time, we just want
        // case-insensitive term match.
        ascii_keyword: {
          type: 'custom' as const,
          char_filter: [],
          filter: ['lowercase'],
        },
      },
    },
  },
  mappings: {
    properties: {
      // ── identifiers ─────────────────────────────────────────────
      id:   { type: 'keyword' as const },
      slug: { type: 'keyword' as const },

      // ── primary titles (analysed + .keyword + ascii sibling) ────
      title: {
        type: 'text' as const,
        analyzer: 'vietnamese_analyzer',
        fields: { keyword: { type: 'keyword' as const, normalizer: 'ascii_keyword' } },
      },
      titleAscii: {
        type: 'text' as const,
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' as const, normalizer: 'ascii_keyword' } },
      },
      originalTitle: {
        type: 'text' as const,
        analyzer: 'vietnamese_analyzer',
        fields: { keyword: { type: 'keyword' as const, normalizer: 'ascii_keyword' } },
      },
      originalTitleAscii: {
        type: 'text' as const,
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' as const, normalizer: 'ascii_keyword' } },
      },
      // Autocomplete-only field (edge_ngram); kept for fast prefix match.
      titleSuggest: {
        type: 'text' as const,
        analyzer: 'autocomplete_analyzer',
        search_analyzer: 'autocomplete_search_analyzer',
      },

      // ── people (actors / directors) ─────────────────────────────
      actorText:        { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      actorTextAscii:   { type: 'text' as const, analyzer: 'standard' },
      directorText:     { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      directorTextAscii:{ type: 'text' as const, analyzer: 'standard' },
      actorsSuggest:    { type: 'text' as const, analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },

      // Characters (role names in the movie) — kept for niche queries.
      characters:        { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      charactersSuggest: { type: 'text' as const, analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },

      // ── classification (genres / countries) ─────────────────────
      categories:        { type: 'keyword' as const },
      countries:         { type: 'keyword' as const },
      categoryText:      { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      categoryTextAscii: { type: 'text' as const, analyzer: 'standard' },
      countryText:       { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      countryTextAscii:  { type: 'text' as const, analyzer: 'standard' },

      // ── description ─────────────────────────────────────────────
      // No ASCII sibling — boost is already very low (3); savings > value.
      description:       { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      shortDescription:  { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      content:           { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      contentAscii:      { type: 'text' as const, analyzer: 'standard' },

      // ── reviews (user-written) ──────────────────────────────────
      // Aggregated text of approved reviews — title + body concatenated.
      // Indexed at the same low boost as description so review-only hits
      // never dominate title matches, but a query phrase that appears
      // verbatim in a review can still surface that movie.
      reviewText:      { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      reviewTextAscii: { type: 'text' as const, analyzer: 'standard' },

      // ── subtitle / dialogue ─────────────────────────────────────
      // Plain-text extract of subtitle cues (.vtt → text). Populated
      // by `npm run search:sync-subtitles` — NOT by the normal indexer
      // (subtitle download per-movie is too slow for bulk reindex).
      // Empty for movies without subtitle tracks.
      subtitleText:      { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      subtitleTextAscii: { type: 'text' as const, analyzer: 'standard' },

      // ── misc text ───────────────────────────────────────────────
      tags:        { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      seoKeywords: { type: 'text' as const, analyzer: 'vietnamese_analyzer' },

      // ── numeric / flags ─────────────────────────────────────────
      year:           { type: 'integer' as const },
      tmdbId:         { type: 'integer' as const },
      contentType:    { type: 'keyword' as const },
      quality:        { type: 'keyword' as const },
      language:       { type: 'keyword' as const },
      // Not indexed — only fetched for response building.
      thumbUrl:       { type: 'keyword' as const, index: false },
      posterUrl:      { type: 'keyword' as const, index: false },
      rating:         { type: 'float' as const },
      viewCount:      { type: 'integer' as const },
      popularity:     { type: 'float' as const },
      episodeCurrent: { type: 'keyword' as const },
      episodeTotal:   { type: 'integer' as const },
      isActive:       { type: 'boolean' as const },
      isFeatured:     { type: 'boolean' as const },
      isTrending:     { type: 'boolean' as const },
      publishedAt:    { type: 'date' as const },
      updatedAt:      { type: 'date' as const },
    },
  },
}
