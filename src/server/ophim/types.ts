// ============================================
// OPhim API Response Types
// ============================================

/** Catalog list item (from /danh-sach/phim-moi-cap-nhat) */
export interface OPhimCatalogItem {
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

export interface OPhimCatalogResponse {
  status: boolean
  items: OPhimCatalogItem[]
  pathImage: string
  pagination: {
    totalItems: number
    totalItemsPerPage: number
    currentPage: number
    totalPages: number
  }
}

/** Movie detail (from /phim/{slug}) */
export interface OPhimMovieDetail {
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

export interface OPhimEpisodeData {
  name: string          // "1", "2", "Full"
  slug: string          // "1", "2", "full"
  filename: string      // "Movie Name - Tập 1"
  link_embed: string    // iframe embed URL
  link_m3u8: string     // m3u8 stream URL
}

export interface OPhimEpisodeServer {
  server_name: string   // "Vietsub #1", "Thuyết Minh #1"
  is_ai: boolean
  server_data: OPhimEpisodeData[]
}

export interface OPhimDetailResponse {
  status: boolean
  msg: string
  movie: OPhimMovieDetail
  episodes: OPhimEpisodeServer[]
}

/** Mapped result ready for Prisma upsert */
export interface MappedMovie {
  ophimId: string
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  contentType: string
  status: string
  quality: string | null
  language: string | null
  year: number | null
  episodeCurrent: string | null
  episodeTotal: number | null
  trailerUrl: string | null
  thumbUrl: string | null
  posterUrl: string | null
  isCopyright: boolean
  actorText: string | null
  directorText: string | null
  categoryText: string | null
  countryText: string | null
  tmdbId: number | null
  imdbId: string | null
  metadataSource: string
  sourceStatus: string
}

export interface MappedEpisode {
  sourceName: string
  serverName: string
  episodeName: string
  episodeSlug: string
  episodeNumber: number
  episodeOrder: number
  streamType: string
  streamUrl: string | null
  sourceUrl: string | null
  status: string
  isActive: boolean
}

export interface MappedCategory {
  name: string
  slug: string
}

export interface MappedCountry {
  name: string
  slug: string
}

export interface SyncResult {
  action: 'create' | 'update' | 'skip' | 'fail'
  movieSlug: string
  movieTitle: string
  movieId?: string
  episodeCount?: number
  message?: string
  error?: string
}
