// ============================================
// OPhim18 API Response Types (v1/api format)
// ============================================

/** Catalog item from /v1/api/danh-sach/* */
export interface OPhim18CatalogItem {
  _id: string
  name: string
  slug: string
  origin_name: string
  type: string
  thumb_url: string        // relative path, prepend APP_DOMAIN_CDN_IMAGE
  poster_url: string       // relative path
  sub_docquyen: boolean
  chieurap: boolean
  time: string
  episode_current: string
  quality: string
  lang: string
  year: number
  category: Array<{ id: string; name: string; slug: string }>
  country: Array<{ id: string; name: string; slug: string }>
  tmdb?: {
    type: string
    id: string
    season: number | null
    vote_average: number
    vote_count: number
  }
  imdb?: {
    id: string
  }
  modified?: {
    time: string
  }
}

export interface OPhim18CatalogResponse {
  status: string | boolean   // "success" or true
  data: {
    seoOnPage?: Record<string, unknown>
    breadCrumb?: unknown[]
    titlePage?: string
    items: OPhim18CatalogItem[]
    params?: {
      type_slug?: string
      filterCategory?: string[]
      filterCountry?: string[]
      filterYear?: string
      filterType?: string
      sortField?: string
      sortType?: string
      pagination?: {
        totalItems: number
        totalItemsPerPage: number
        currentPage: number
        totalPages: number
      }
    }
    type_list?: string
    APP_DOMAIN_FRONTEND?: string
    APP_DOMAIN_CDN_IMAGE?: string
  }
}

/** Movie detail from /v1/api/phim/{slug} */
export interface OPhim18MovieItem {
  _id: string
  name: string
  slug: string
  origin_name: string
  alternative_names?: string[]
  content: string
  type: string              // movie | series | single | hoathinh | tvshows
  status: string            // ongoing | completed | trailer
  thumb_url: string         // relative path
  poster_url: string        // relative path
  is_copyright: boolean
  sub_docquyen: boolean
  chieurap: boolean
  trailer_url: string
  time: string
  episode_current: string
  episode_total: string
  quality: string
  lang: string
  lang_key?: string[]
  notify: string
  showtimes: string
  year: number
  view: number
  actor: string[]
  director: string[]
  category: Array<{ id: string; name: string; slug: string }>
  country: Array<{ id: string; name: string; slug: string }>
  tmdb?: {
    type: string
    id: string
    season: number | null
    vote_average: number
    vote_count: number
  }
  imdb?: {
    id: string
    vote_average?: number
    vote_count?: number
  }
  created?: { time: string }
  modified?: { time: string }
  episodes: OPhim18EpisodeServer[]
}

export interface OPhim18EpisodeData {
  name: string          // "1", "2", "Full"
  slug: string          // "1", "2", "full"
  filename: string      // "Movie Name - Tập 1"
  link_embed: string    // iframe embed URL
  link_m3u8: string     // m3u8 stream URL
}

export interface OPhim18EpisodeServer {
  server_name: string   // "Vietsub #1", "Thuyết Minh #1"
  is_ai: boolean
  server_data: OPhim18EpisodeData[]
}

export interface OPhim18DetailResponse {
  status: string | boolean   // "success" or true
  data: {
    seoOnPage?: Record<string, unknown>
    breadCrumb?: unknown[]
    params?: Record<string, unknown>
    item: OPhim18MovieItem
    APP_DOMAIN_CDN_IMAGE: string
  }
}

/** Search response */
export interface OPhim18SearchResponse {
  status: string | boolean
  data: {
    seoOnPage?: Record<string, unknown>
    titlePage?: string
    items: OPhim18CatalogItem[]
    params?: {
      keyword?: string
      pagination?: {
        totalItems: number
        totalItemsPerPage: number
        currentPage: number
        totalPages: number
      }
    }
    APP_DOMAIN_CDN_IMAGE?: string
  }
}

// ─── Shared Mapped Types (re-exported from sync-types.ts) ───────
// Sprint 4B: Single source of truth for mapped types shared with OPhim.
export type {
  MappedMovie,
  MappedEpisode,
  MappedCategory,
  MappedCountry,
  SyncResult,
} from './sync-types'

