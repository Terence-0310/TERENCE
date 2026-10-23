// ============================================
// KKPhim API Response Types
// ============================================

/** Catalog list item (from /danh-sach/phim-moi-cap-nhat) */
export interface KKPhimCatalogItem {
  _id: string
  name: string
  slug: string
  origin_name: string
  thumb_url: string
  poster_url: string
  year: number
  tmdb?: {
    type: string
    id: string
    season: number | null
    vote_average: number
    vote_count: number
  }
  imdb?: {
    id: string
    vote_average: number
    vote_count: number
  }
  modified?: {
    time: string
  }
}

export interface KKPhimCatalogResponse {
  status: boolean
  items: KKPhimCatalogItem[]
  pathImage: string
  pagination: {
    totalItems: number
    totalItemsPerPage: number
    currentPage: number
    totalPages: number
  }
}

/** Movie detail (from /phim/{slug}) */
export interface KKPhimMovieDetail {
  _id: string
  name: string
  slug: string
  origin_name: string
  alternative_names?: string[]
  content: string
  type: string            // movie | series | single | hoathinh | tvshows
  status: string          // ongoing | completed | trailer
  thumb_url: string
  poster_url: string
  is_copyright: boolean
  sub_docquyen: boolean
  chieurap: boolean
  trailer_url: string
  time: string            // e.g. "120 phút" or "? phút/tập"
  episode_current: string // e.g. "Tập 9" or "Full"
  episode_total: string   // e.g. "50 Tập" or "1"
  quality: string         // HD | FHD | SD | CAM
  lang: string            // Vietsub | Thuyết Minh | Lồng Tiếng
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
    vote_average: number
    vote_count: number
  }
  created?: { time: string }
  modified?: { time: string }
}

export interface KKPhimEpisodeData {
  name: string          // "1", "2", "Full"
  slug: string          // "1", "2", "full"
  filename: string      // "Movie Name - Tập 1"
  link_embed: string    // iframe embed URL
  link_m3u8: string     // m3u8 stream URL
}

export interface KKPhimEpisodeServer {
  server_name: string   // "Vietsub #1", "Thuyết Minh #1"
  is_ai: boolean
  server_data: KKPhimEpisodeData[]
}

export interface KKPhimDetailResponse {
  status: boolean
  msg: string
  movie: KKPhimMovieDetail
  episodes: KKPhimEpisodeServer[]
}

// ─── Shared Mapped Types (re-exported from sync-types.ts) ───────
// Sprint 4B: Single source of truth for mapped types shared with KKPhim18.
export type {
  MappedMovie,
  MappedEpisode,
  MappedCategory,
  MappedCountry,
  SyncResult,
} from '@/src/be/shared/catalog-sync/sync-types'

