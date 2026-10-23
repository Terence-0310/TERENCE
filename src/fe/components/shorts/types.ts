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
}

export type FeedTab = 'foryou' | 'latest' | 'popular'

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
