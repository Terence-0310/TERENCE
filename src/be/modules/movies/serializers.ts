// ============================================
// Movie Serializers
// ============================================
// Clean response shapes — no raw Prisma leaks. All API routes use these.

// ─── Movie Card (for lists) ─────────────────────────────────────

export interface MovieCardDto {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  contentType: string
  year: number | null
  quality: string | null
  language: string | null
  thumbUrl: string | null
  posterUrl: string | null
  rating: number | null
  episodeCurrent: string | null
  episodeTotal: number | null
  isFeatured: boolean
  isTrending: boolean
  viewCount: number
  categories: string[]
  countries: string[]
}

export function serializeMovieCard(m: Record<string, unknown>): MovieCardDto {
  return {
    id: m.id as string,
    slug: m.slug as string,
    title: m.title as string,
    originalTitle: (m.originalTitle as string) || null,
    contentType: m.contentType as string,
    year: (m.year as number) || null,
    quality: (m.quality as string) || null,
    language: (m.language as string) || null,
    thumbUrl: (m.thumbUrl as string) || null,
    posterUrl: (m.posterUrl as string) || null,
    rating: (m.rating as number) || null,
    episodeCurrent: (m.episodeCurrent as string) || null,
    episodeTotal: (m.episodeTotal as number) || null,
    isFeatured: !!m.isFeatured,
    isTrending: !!m.isTrending,
    viewCount: (m.viewCount as number) || 0,
    categories: extractPivotNames(m.genres, 'genre'),
    countries: extractPivotNames(m.countries, 'country'),
  }
}

// ─── Movie Detail ───────────────────────────────────────────────

export interface PreferredPlaybackDto {
  streamType: string
  streamUrl: string
  serverName: string | null
  sourceName: string | null
}

export interface MovieSourceDto {
  id: string
  sourceName: string
  sourceUrl: string | null
  quality: string | null
  language: string | null
  priority: number
}

export interface MovieDetailDto extends MovieCardDto {
  description: string | null
  shortDescription: string | null
  backdropUrl: string | null
  trailerUrl: string | null
  trailerSite: string | null
  trailerKey: string | null
  tmdbId: number | null
  imdbId: string | null
  duration: number | null
  ageRating: string | null

  tags: string | null
  status: string
  isRecommended: boolean
  sourceStatus: string
  matchConfidence: number | null
  metadataSource: string | null
  seoTitle: string | null
  seoDescription: string | null
  people: PersonDto[]
  movieSources: MovieSourceDto[]
  hasPlayback: boolean
  preferredPlayback: PreferredPlaybackDto | null
}

export interface PersonDto {
  id: string
  name: string
  slug: string
  role: string
  character: string | null
  profileUrl: string | null
}

export function serializeMovieDetail(m: Record<string, unknown>): MovieDetailDto {
  const card = serializeMovieCard(m)
  const preferredPlayback = computePreferredPlayback(m.episodes)
  const movieSources = extractMovieSources(m.movieSources)

  return {
    ...card,
    description: (m.description as string) || null,
    shortDescription: (m.shortDescription as string) || null,
    backdropUrl: (m.backdropUrl as string) || null,
    trailerUrl: (m.trailerUrl as string) || null,
    trailerSite: (m.trailerSite as string) || null,
    trailerKey: (m.trailerKey as string) || null,
    tmdbId: (m.tmdbId as number) || null,
    imdbId: (m.imdbId as string) || null,
    duration: (m.duration as number) || null,
    ageRating: (m.ageRating as string) || null,

    tags: (m.tags as string) || null,
    status: m.status as string,
    isRecommended: !!m.isRecommended,
    sourceStatus: m.sourceStatus as string,
    matchConfidence: (m.matchConfidence as number) || null,
    metadataSource: (m.metadataSource as string) || null,
    seoTitle: (m.seoTitle as string) || null,
    seoDescription: (m.seoDescription as string) || null,
    people: extractPeople(m.people),
    movieSources,
    hasPlayback: preferredPlayback !== null,
    preferredPlayback,
  }
}

// ─── Episode ────────────────────────────────────────────────────

export interface EpisodeDto {
  id: string
  episodeName: string | null
  episodeSlug: string | null
  episodeNumber: number
  episodeOrder: number
  streamType: string
  streamUrl: string | null
  sourceUrl: string | null
  sourceName: string | null
  serverName: string | null
  quality: string | null
  language: string | null
  isActive: boolean
}

export interface EpisodeGroupDto {
  serverName: string
  episodes: EpisodeDto[]
}

export function serializeEpisode(e: Record<string, unknown>): EpisodeDto {
  return {
    id: e.id as string,
    episodeName: (e.episodeName as string) || null,
    episodeSlug: (e.episodeSlug as string) || null,
    episodeNumber: (e.episodeNumber as number) || 1,
    episodeOrder: (e.episodeOrder as number) || 0,
    streamType: (e.streamType as string) || 'mp4',
    streamUrl: (e.streamUrl as string) || null,
    sourceUrl: (e.sourceUrl as string) || null,
    sourceName: (e.sourceName as string) || null,
    serverName: (e.serverName as string) || null,
    quality: (e.quality as string) || null,
    language: (e.language as string) || null,
    isActive: e.isActive !== false,
  }
}

export function groupEpisodesByServer(episodes: EpisodeDto[]): EpisodeGroupDto[] {
  const groups = new Map<string, EpisodeDto[]>()
  for (const ep of episodes) {
    const key = ep.serverName || 'Default'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ep)
  }
  return Array.from(groups.entries()).map(([serverName, episodes]) => ({
    serverName,
    episodes: episodes.sort((a, b) => a.episodeOrder - b.episodeOrder),
  }))
}

// ─── Pagination ─────────────────────────────────────────────────

export interface PaginationDto {
  page: number
  perPage: number
  total: number
  totalPages: number
  nextCursor?: string | null
}

export function serializePagination(page: number, perPage: number, total: number, nextCursor?: string | null): PaginationDto {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage), nextCursor }
}

// ─── Helpers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPivotNames(pivots: unknown, childKey: string): string[] {
  if (!Array.isArray(pivots)) return []
  return pivots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p[childKey]?.name as string)
    .filter(Boolean)
}

function extractPeople(people: unknown): PersonDto[] {
  if (!Array.isArray(people)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return people.map((mp: any) => ({
    id: mp.person?.id || mp.personId,
    name: mp.person?.name || 'Unknown',
    slug: mp.person?.slug || '',
    role: mp.role || 'actor',
    character: mp.character || null,
    profileUrl: mp.person?.profileUrl || null,
  }))
}

function extractMovieSources(sources: unknown): MovieSourceDto[] {
  if (!Array.isArray(sources)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sources.map((s: any) => ({
    id: s.id,
    sourceName: s.sourceName || '',
    sourceUrl: s.sourceUrl || null,
    quality: s.quality || null,
    language: s.language || null,
    priority: s.priority || 0,
  }))
}

// ─── Playback Source Selection ──────────────────────────────────

// Priority order for stream types
const STREAM_PRIORITY: Record<string, number> = {
  'm3u8': 4,
  'hls': 4,
  'embed': 3,
  'iframe': 3,
  'mp4': 2,
  'other': 1,
}

function computePreferredPlayback(episodes: unknown): PreferredPlaybackDto | null {
  if (!Array.isArray(episodes) || episodes.length === 0) return null

  // Find the best episode with a usable stream
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usableEpisodes = episodes.filter((ep: any) => ep.streamUrl && ep.isActive)
  if (usableEpisodes.length === 0) return null

  // Sort by stream type priority (m3u8 > embed > mp4 > other)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usableEpisodes.sort((a: any, b: any) => {
    const aPriority = STREAM_PRIORITY[a.streamType] || 0
    const bPriority = STREAM_PRIORITY[b.streamType] || 0
    return bPriority - aPriority
  })

  const best = usableEpisodes[0]
  return {
    streamType: best.streamType,
    streamUrl: best.streamUrl,
    serverName: best.serverName || null,
    sourceName: best.sourceName || null,
  }
}
