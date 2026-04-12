// ============================================
// Episodes Module — Types
// ============================================

export interface EpisodeDetail {
  id: string
  episodeName: string | null
  episodeSlug: string | null
  episodeNumber: number | null
  episodeOrder: number | null
  streamType: string | null
  streamUrl: string | null
  sourceUrl: string | null
  sourceName: string | null
  serverName: string | null
  quality: string | null
  language: string | null
  isActive: boolean
}
