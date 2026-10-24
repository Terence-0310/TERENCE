// Client mirror of ShortDto (src/be/modules/shorts/shorts.service.ts).
export interface ShortItem {
  id: string
  title: string
  description: string | null
  hashtags: string[]
  source: string
  videoType: 'youtube' | 'mp4' | 'hls' | string
  videoUrl: string
  thumbnailUrl: string | null
  orientation: 'portrait' | 'landscape' | string
  duration: number | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  publishedAt: string
  likedByMe: boolean
  movie: { id: string; slug: string; title: string; posterUrl: string | null; year: number | null; contentType: string } | null
  /** Set for library videos (Coverr / mock): no TERENCE likes, comments or views. */
  external?: {
    provider: 'coverr' | 'mock'
    author: { name: string; url: string | null } | null
    license: { name: string; url: string | null; attribution: string | null; attributionUrl: string | null }
  }
}

// Client mirror of LibraryVideo (src/be/modules/shorts/video-providers/types.ts).
export interface LibraryVideo {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  width: number | null
  height: number | null
  author: { name: string; url: string | null } | null
  tags: string[]
  source: 'coverr' | 'mock'
  license: { name: string; url: string | null; attribution: string | null; attributionUrl: string | null }
  createdAt: string
}

export interface LibraryStatus {
  provider: 'coverr' | 'mock'
  mode: 'live' | 'cache' | 'stale' | 'fallback'
  configured: boolean
}

export function libraryToItem(v: LibraryVideo): ShortItem {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    hashtags: v.tags.map((t) => t.replace(/\s+/g, '')).filter(Boolean),
    source: v.source,
    videoType: 'mp4',
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    orientation: v.width && v.height && v.height > v.width ? 'portrait' : 'landscape',
    duration: v.duration,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    publishedAt: v.createdAt,
    likedByMe: false,
    movie: null,
    external: { provider: v.source, author: v.author, license: v.license },
  }
}

export type FeedTab = 'foryou' | 'latest' | 'popular' | 'discover'

export const LIBRARY_TOPICS = [
  { id: 'nature', label: 'Thiên nhiên' },
  { id: 'city', label: 'Thành phố' },
  { id: 'ocean', label: 'Biển' },
  { id: 'animals', label: 'Động vật' },
  { id: 'sky', label: 'Bầu trời' },
  { id: 'food', label: 'Ẩm thực' },
  { id: 'people', label: 'Con người' },
] as const

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
