// ============================================
// Shorts — external video library: provider contract
// ============================================
// The "Khám phá" library is served live from an external stock-video provider
// (Coverr) through this interface, with a mock provider for development. These
// videos are NOT rows in the Short table: they have no TERENCE likes, comments
// or views, and are never downloaded to our storage. TERENCE's own shorts
// (imported trailers, admin uploads) stay in the database — see shorts.service.

export type LibraryProviderName = 'coverr' | 'mock'

export type LibrarySort = 'popular' | 'trending' | 'latest'

/** Provider-agnostic video, as returned by /api/v1/shorts/search|trending. */
export interface LibraryVideo {
  /** "<provider>:<providerId>" — never collides with Short ids (cuid, no colon). */
  id: string
  title: string
  description: string | null
  /** Direct media URL (MP4 / WebM) played by the browser; not proxied. */
  videoUrl: string
  thumbnailUrl: string | null
  /** Seconds. */
  duration: number | null
  width: number | null
  height: number | null
  author: { name: string; url: string | null } | null
  tags: string[]
  source: LibraryProviderName
  license: {
    name: string
    url: string | null
    /** Credit line the provider's terms require next to the video, if any. */
    attribution: string | null
    attributionUrl: string | null
  }
  createdAt: string
}

export interface ProviderListParams {
  sort: LibrarySort
  /** Free-text search; empty = browse. */
  query?: string
  /** Zero-based page. */
  page: number
  pageSize: number
}

export interface ProviderListResult {
  items: LibraryVideo[]
  hasMore: boolean
}

export interface VideoProvider {
  readonly name: LibraryProviderName
  /** False when required credentials are missing — the provider is skipped. */
  isConfigured(): boolean
  list(params: ProviderListParams): Promise<ProviderListResult>
  /** Null when the provider has no such video. */
  getById(providerId: string): Promise<LibraryVideo | null>
}

export type ProviderErrorKind = 'auth' | 'quota' | 'unavailable' | 'bad_response'

export class VideoProviderError extends Error {
  constructor(
    message: string,
    readonly provider: LibraryProviderName,
    readonly kind: ProviderErrorKind,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'VideoProviderError'
  }
}
