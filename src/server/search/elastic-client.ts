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
  }
}

/**
 * Get the Elasticsearch client singleton.
 * Creates a new client on first call.
 */
export function getClient(): Client {
  if (!_client) {
    const { host, username, password } = getConfig()
    const auth = username && password ? { username, password } : undefined

    _client = new Client({
      node: host,
      auth,
      requestTimeout: 10000,
      maxRetries: 2,
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
 * Check if Elasticsearch is available. Caches result for 60s.
 */
let _lastCheck = 0
export async function isAvailable(): Promise<boolean> {
  const now = Date.now()
  if (_available !== null && now - _lastCheck < 60_000) return _available

  try {
    const client = getClient()
    await client.ping()
    _available = true
  } catch {
    _available = false
  }
  _lastCheck = now
  return _available
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

export const MOVIES_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        vietnamese_analyzer: {
          type: 'custom' as const,
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
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
          min_gram: 2,
          max_gram: 20,
          token_chars: ['letter' as const, 'digit' as const],
        },
      },
    },
  },
  mappings: {
    properties: {
      id:             { type: 'keyword' as const },
      slug:           { type: 'keyword' as const },
      title:          { type: 'text' as const, analyzer: 'vietnamese_analyzer', fields: { keyword: { type: 'keyword' as const } } },
      originalTitle:  { type: 'text' as const, analyzer: 'vietnamese_analyzer', fields: { keyword: { type: 'keyword' as const } } },
      titleSuggest:   { type: 'text' as const, analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },
      description:    { type: 'text' as const, analyzer: 'vietnamese_analyzer' },
      actors:         { type: 'text' as const, analyzer: 'vietnamese_analyzer', fields: { keyword: { type: 'keyword' as const } } },
      directors:      { type: 'text' as const, analyzer: 'vietnamese_analyzer', fields: { keyword: { type: 'keyword' as const } } },
      categories:     { type: 'keyword' as const },
      countries:      { type: 'keyword' as const },
      year:           { type: 'integer' as const },
      contentType:    { type: 'keyword' as const },
      quality:        { type: 'keyword' as const },
      language:       { type: 'keyword' as const },
      thumbUrl:       { type: 'keyword' as const, index: false },
      posterUrl:      { type: 'keyword' as const, index: false },
      rating:         { type: 'float' as const },
      viewCount:      { type: 'integer' as const },
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
