import type { VideoSourceProvider } from './provider'
import type { MovieDetail, Episode, PlaybackSource } from '@/types/movie'

interface OPhimSearchResult {
  status: string
  data: {
    items: {
      name: string
      origin_name: string
      slug: string
      year: number
    }[]
  }
}

interface OPhimDetail {
  status: boolean
  movie: {
    id: string
    name: string
    slug: string
    episode_total: string
    episode_current: string
  }
  episodes: {
    server_name: string
    server_data: {
      name: string
      slug: string
      filename: string
      link_embed: string
      link_m3u8: string
    }[]
  }[]
}

export class OPhimVideoProvider implements VideoSourceProvider {
  name = 'OPhim API'
  priority = 5 // Higher priority than Demo, lower than DB

  // In-memory cache for search results during resolving
  private searchCache = new Map<number, string | null>()
  private detailCache = new Map<string, OPhimDetail>()

  async hasSource(movie: MovieDetail): Promise<boolean> {
    const slug = await this.findOPhimSlug(movie)
    return !!slug
  }

  getSourceType(movie: MovieDetail): 'hls' | 'mp4' | 'youtube' | 'iframe' | 'none' {
    return 'hls' // Default assumption, actual type returned by getPlayback
  }

  async getPlayback(movie: MovieDetail, episodeSlug?: string): Promise<PlaybackSource | null> {
    const slug = await this.findOPhimSlug(movie)
    if (!slug) return null

    const detail = await this.getOPhimDetail(slug)
    if (!detail || !detail.episodes || detail.episodes.length === 0) return null

    // Get first server (usually VIP)
    const server = detail.episodes[0]
    if (!server.server_data || server.server_data.length === 0) return null

    // Find requested episode or default to first
    let epData = server.server_data[0]
    if (episodeSlug) {
      // Find matching slug, or exact name
      const match = server.server_data.find(e => 
        e.slug === episodeSlug || 
        e.name === episodeSlug || 
        `tap-${e.name}` === episodeSlug
      )
      if (match) epData = match
    }

    if (!epData.link_m3u8 && !epData.link_embed) return null

    if (epData.link_m3u8) {
      return {
        type: 'hls',
        url: epData.link_m3u8,
        label: 'Auto (OPhim)',
        subtitles: []
      }
    } else {
      return {
        type: 'iframe',
        url: epData.link_embed,
        label: 'Auto (OPhim Embed)',
        subtitles: []
      }
    }
  }

  async getEpisodes(movie: MovieDetail): Promise<Episode[]> {
    const slug = await this.findOPhimSlug(movie)
    if (!slug) return []

    const detail = await this.getOPhimDetail(slug)
    if (!detail || !detail.episodes || detail.episodes.length === 0) return []

    const server = detail.episodes[0]
    if (!server.server_data) return []

    return server.server_data.map(ep => {
      // Generate clean slug consistently
      const cleanSlug = ep.slug ? ep.slug : `tap-${ep.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      return {
        id: `ep-${cleanSlug}`,
        number: parseInt(ep.name) || 0,
        title: `Tập ${ep.name}`,
        slug: cleanSlug
      }
    })
  }

  // Helper to search OPhim API using TMDB title
  private async findOPhimSlug(movie: MovieDetail): Promise<string | null> {
    if (this.searchCache.has(movie.id)) {
      return this.searchCache.get(movie.id)!
    }

    try {
      // Prefer original title for better match, fallback to local title
      const query = movie.originalTitle || movie.title
      const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`)
      const json = await res.json() as OPhimSearchResult

      if (json.status === 'success' && json.data?.items?.length > 0) {
        // Find best match: check year and exact title match
        let bestMatch = json.data.items[0]
        
        // Let's refine matching if multiple results
        const sameYear = json.data.items.find(i => i.year === movie.year)
        if (sameYear) bestMatch = sameYear

        this.searchCache.set(movie.id, bestMatch.slug)
        return bestMatch.slug
      }

      // Try alternative: Vietnamese title if original failed
      if (movie.originalTitle && movie.originalTitle !== movie.title) {
        const res2 = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(movie.title)}`)
        const json2 = await res2.json() as OPhimSearchResult
        if (json2.status === 'success' && json2.data?.items?.length > 0) {
          this.searchCache.set(movie.id, json2.data.items[0].slug)
          return json2.data.items[0].slug
        }
      }

      this.searchCache.set(movie.id, null)
      return null
    } catch (err) {
      console.error('[OPhimVideoProvider] Search error:', err)
      return null
    }
  }

  // Helper to fetch movie details from OPhim
  private async getOPhimDetail(slug: string): Promise<OPhimDetail | null> {
    if (this.detailCache.has(slug)) {
      return this.detailCache.get(slug)!
    }

    try {
      const res = await fetch(`https://ophim1.com/phim/${encodeURIComponent(slug)}`)
      const json = await res.json() as OPhimDetail

      if (json.status && json.movie) {
        this.detailCache.set(slug, json)
        return json
      }
      return null
    } catch (err) {
      console.error('[OPhimVideoProvider] Detail error:', err)
      return null
    }
  }
}
