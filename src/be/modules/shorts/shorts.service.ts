// ============================================
// Shorts Service — feed, interactions, admin, sync
// ============================================

import { Prisma } from '@prisma/client'
import { prisma } from '@/src/be/shared/db/prisma'
import { AppError } from '@/src/be/shared/errors/app-error'
import { PUBLISHED_FILTER } from '@/src/be/modules/movies/movie-service'
import {
  catalogTrailerShort, fetchTmdbShorts, fetchYouTubeShorts, isTmdbConfigured, isYouTubeEmbeddable, isYouTubeConfigured,
  parseYouTubeId, youtubeThumbnail, type ProviderMovie, type ShortCandidate,
} from './shorts.providers'

// ─── DTO ────────────────────────────────────────────────────────

export interface ShortDto {
  id: string
  title: string
  description: string | null
  hashtags: string[]
  source: string
  videoType: string
  videoUrl: string
  thumbnailUrl: string | null
  orientation: string
  duration: number | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  publishedAt: string
  likedByMe: boolean
  movie: { id: string; slug: string; title: string; posterUrl: string | null; year: number | null; contentType: string } | null
}

const SHORT_INCLUDE = {
  movie: { select: { id: true, slug: true, title: true, posterUrl: true, year: true, contentType: true } },
} as const

type ShortRow = Prisma.ShortGetPayload<{ include: typeof SHORT_INCLUDE }>

function toDto(s: ShortRow, likedIds: Set<string>): ShortDto {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    hashtags: s.hashtags ? s.hashtags.split(/\s+/).filter(Boolean) : [],
    source: s.source,
    videoType: s.videoType,
    videoUrl: s.videoUrl,
    thumbnailUrl: s.thumbnailUrl,
    orientation: s.orientation,
    duration: s.duration,
    viewCount: s.viewCount,
    likeCount: s.likeCount,
    commentCount: s.commentCount,
    shareCount: s.shareCount,
    publishedAt: s.publishedAt.toISOString(),
    likedByMe: likedIds.has(s.id),
    movie: s.movie,
  }
}

async function likedSet(userId: string | null | undefined, shortIds: string[]): Promise<Set<string>> {
  if (!userId || shortIds.length === 0) return new Set()
  const rows = await prisma.shortLike.findMany({
    where: { userId, shortId: { in: shortIds } },
    select: { shortId: true },
  })
  return new Set(rows.map((r) => r.shortId))
}

// ─── Feed ───────────────────────────────────────────────────────

export type FeedTab = 'foryou' | 'latest' | 'popular'

export interface FeedOptions {
  tab?: FeedTab
  /** Random seed for the "foryou" order — keeps pagination stable per session. */
  seed?: string
  limit?: number
  skip?: number
  movieId?: string
  userId?: string | null
}

export async function getFeed(opts: FeedOptions = {}): Promise<ShortDto[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 30)
  const skip = Math.max(opts.skip ?? 0, 0)
  const tab = opts.tab ?? 'foryou'
  const where: Prisma.ShortWhereInput = { status: 'published', ...(opts.movieId ? { movieId: opts.movieId } : {}) }

  let rows: ShortRow[]
  if (tab === 'foryou' && !opts.movieId) {
    // Deterministic shuffle: order by md5(id || seed). Same seed ⇒ same order,
    // so infinite scroll never repeats or skips items.
    const seed = (opts.seed || 'terence').slice(0, 32)
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Short" WHERE status = 'published'
      ORDER BY md5(id || ${seed}) LIMIT ${limit} OFFSET ${skip}`
    const found = await prisma.short.findMany({ where: { id: { in: ids.map((r) => r.id) } }, include: SHORT_INCLUDE })
    const byId = new Map(found.map((s) => [s.id, s]))
    rows = ids.map((r) => byId.get(r.id)).filter((s): s is ShortRow => !!s)
  } else {
    rows = await prisma.short.findMany({
      where,
      include: SHORT_INCLUDE,
      orderBy: tab === 'popular'
        ? [{ likeCount: 'desc' }, { viewCount: 'desc' }]
        : [{ publishedAt: 'desc' }],
      take: limit,
      skip,
    })
  }

  const liked = await likedSet(opts.userId, rows.map((r) => r.id))
  return rows.map((r) => toDto(r, liked))
}

export async function getShortById(id: string, userId?: string | null): Promise<ShortDto | null> {
  const row = await prisma.short.findFirst({ where: { id, status: 'published' }, include: SHORT_INCLUDE })
  if (!row) return null
  return toDto(row, await likedSet(userId, [row.id]))
}

// ─── Interactions ───────────────────────────────────────────────

async function requirePublished(id: string) {
  const exists = await prisma.short.findFirst({ where: { id, status: 'published' }, select: { id: true } })
  if (!exists) throw new AppError('Không tìm thấy video', 404, 'NOT_FOUND')
}

export async function toggleLike(shortId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  await requirePublished(shortId)
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shortLike.findUnique({ where: { shortId_userId: { shortId, userId } } })
    if (existing) {
      await tx.shortLike.delete({ where: { id: existing.id } })
      const s = await tx.short.update({ where: { id: shortId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } })
      return { liked: false, likeCount: Math.max(0, s.likeCount) }
    }
    await tx.shortLike.create({ data: { shortId, userId } })
    const s = await tx.short.update({ where: { id: shortId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } })
    return { liked: true, likeCount: s.likeCount }
  })
}

export async function incrementCounter(shortId: string, field: 'viewCount' | 'shareCount'): Promise<number> {
  await requirePublished(shortId)
  const s = await prisma.short.update({
    where: { id: shortId },
    data: { [field]: { increment: 1 } },
    select: { viewCount: true, shareCount: true },
  })
  return s[field]
}

export interface ShortCommentDto {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null; avatar: string | null }
}

export async function listComments(shortId: string, skip = 0, limit = 20): Promise<{ items: ShortCommentDto[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.shortComment.findMany({
      where: { shortId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(limit, 50),
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.shortComment.count({ where: { shortId } }),
  ])
  return {
    total,
    items: rows.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString(), user: c.user })),
  }
}

export async function addComment(shortId: string, userId: string, content: string): Promise<ShortCommentDto> {
  await requirePublished(shortId)
  const [comment] = await prisma.$transaction([
    prisma.shortComment.create({
      data: { shortId, userId, content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.short.update({ where: { id: shortId }, data: { commentCount: { increment: 1 } } }),
  ])
  return { id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), user: comment.user }
}

/** Delete a comment. Authors can delete their own; moderators pass `canModerate`. */
export async function deleteComment(shortId: string, commentId: string, userId: string, canModerate: boolean): Promise<void> {
  const comment = await prisma.shortComment.findFirst({ where: { id: commentId, shortId } })
  if (!comment) throw new AppError('Không tìm thấy bình luận', 404, 'NOT_FOUND')
  if (comment.userId !== userId && !canModerate) throw new AppError('Bạn không thể xoá bình luận này', 403, 'FORBIDDEN')
  await prisma.$transaction([
    prisma.shortComment.delete({ where: { id: commentId } }),
    prisma.short.update({ where: { id: shortId }, data: { commentCount: { decrement: 1 } } }),
  ])
}

// ─── Admin ──────────────────────────────────────────────────────

export interface AdminListOptions {
  page?: number
  limit?: number
  search?: string
  status?: string
  source?: string
}

export async function adminList(opts: AdminListOptions = {}) {
  const page = Math.max(opts.page ?? 1, 1)
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
  const where: Prisma.ShortWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.source ? { source: opts.source } : {}),
    ...(opts.search
      ? {
          OR: [
            { title: { contains: opts.search, mode: 'insensitive' } },
            { movie: { title: { contains: opts.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
  const [items, total, stats] = await Promise.all([
    prisma.short.findMany({ where, include: SHORT_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.short.count({ where }),
    prisma.short.groupBy({ by: ['status'], _count: { _all: true }, _sum: { viewCount: true, likeCount: true } }),
  ])
  return {
    items: items.map((s) => ({ ...toDto(s, new Set()), status: s.status, createdAt: s.createdAt.toISOString() })),
    total,
    page,
    limit,
    stats: {
      byStatus: Object.fromEntries(stats.map((s) => [s.status, s._count._all])),
      totalViews: stats.reduce((n, s) => n + (s._sum.viewCount ?? 0), 0),
      totalLikes: stats.reduce((n, s) => n + (s._sum.likeCount ?? 0), 0),
    },
    providers: { tmdb: isTmdbConfigured(), youtube: isYouTubeConfigured() },
  }
}

export interface AdminShortInput {
  movieId?: string | null
  title: string
  description?: string | null
  hashtags?: string | null
  videoType: 'youtube' | 'mp4' | 'hls'
  videoUrl: string
  thumbnailUrl?: string | null
  orientation?: 'portrait' | 'landscape'
  duration?: number | null
  status?: 'draft' | 'published' | 'hidden'
}

function normaliseHashtags(raw: string | null | undefined): string | null {
  if (!raw) return null
  const tags = raw.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean)
  return tags.length ? Array.from(new Set(tags)).join(' ') : null
}

export async function adminCreate(input: AdminShortInput, actorId: string) {
  let videoUrl = input.videoUrl.trim()
  let externalId: string | null = null
  let thumbnailUrl = input.thumbnailUrl || null

  if (input.videoType === 'youtube') {
    const key = parseYouTubeId(videoUrl)
    if (!key) throw new AppError('Link YouTube không hợp lệ', 400, 'BAD_REQUEST')
    videoUrl = key
    externalId = `yt:${key}`
    thumbnailUrl ||= youtubeThumbnail(key)
    if (await prisma.short.findUnique({ where: { externalId } })) {
      throw new AppError('Video này đã có trong Shorts', 409, 'CONFLICT')
    }
  } else if (!/^https?:\/\//i.test(videoUrl) && !videoUrl.startsWith('/')) {
    throw new AppError('URL video không hợp lệ', 400, 'BAD_REQUEST')
  }

  if (input.movieId && !(await prisma.movie.findUnique({ where: { id: input.movieId }, select: { id: true } }))) {
    throw new AppError('Phim liên kết không tồn tại', 400, 'BAD_REQUEST')
  }

  return prisma.short.create({
    data: {
      movieId: input.movieId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      hashtags: normaliseHashtags(input.hashtags),
      source: 'admin',
      externalId,
      videoType: input.videoType,
      videoUrl,
      thumbnailUrl,
      orientation: input.orientation ?? (input.videoType === 'youtube' ? 'landscape' : 'portrait'),
      duration: input.duration ?? null,
      status: input.status ?? 'published',
      createdBy: actorId,
    },
  })
}

export async function adminUpdate(id: string, input: Partial<Omit<AdminShortInput, 'videoType' | 'videoUrl'>>) {
  const existing = await prisma.short.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new AppError('Không tìm thấy video', 404, 'NOT_FOUND')
  return prisma.short.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.hashtags !== undefined ? { hashtags: normaliseHashtags(input.hashtags) } : {}),
      ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl || null } : {}),
      ...(input.orientation !== undefined ? { orientation: input.orientation } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.movieId !== undefined ? { movieId: input.movieId || null } : {}),
    },
  })
}

export async function adminDelete(id: string) {
  const existing = await prisma.short.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new AppError('Không tìm thấy video', 404, 'NOT_FOUND')
  await prisma.short.delete({ where: { id } })
}

// ─── Sync from external APIs ────────────────────────────────────

export interface SyncOptions {
  /** Max movies to scan in this run. */
  limit?: number
  source?: 'tmdb' | 'youtube' | 'catalog' | 'all'
  perMovie?: number
  /** Only scan movies that don't have shorts from this source yet (default true). */
  onlyMissing?: boolean
}

export interface SyncResult {
  moviesScanned: number
  created: number
  skipped: number
  sources: string[]
}

export async function syncShorts(opts: SyncOptions = {}): Promise<SyncResult> {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 500)
  const perMovie = Math.min(Math.max(opts.perMovie ?? 2, 1), 5)
  const wanted = opts.source ?? 'all'
  const sources: ('tmdb' | 'youtube' | 'catalog')[] = []
  if ((wanted === 'tmdb' || wanted === 'all') && isTmdbConfigured()) sources.push('tmdb')
  if ((wanted === 'youtube' || wanted === 'all') && isYouTubeConfigured()) sources.push('youtube')
  if (wanted === 'catalog' || wanted === 'all') sources.push('catalog')
  if (sources.length === 0) {
    throw new AppError(wanted === 'youtube'
      ? 'Chưa cấu hình YOUTUBE_API_KEY'
      : 'Chưa cấu hình TMDB_READ_ACCESS_TOKEN / TMDB_API_KEY', 400, 'BAD_REQUEST')
  }

  let created = 0
  let skipped = 0
  let scanned = 0

  for (const source of sources) {
    const movies = await prisma.movie.findMany({
      where: {
        ...PUBLISHED_FILTER,
        ...(source === 'tmdb' ? { tmdbId: { not: null } } : {}),
        ...(source === 'catalog' ? { trailerKey: { not: null } } : {}),
        ...(opts.onlyMissing !== false ? { shorts: { none: { source } } } : {}),
      },
      select: {
        id: true, title: true, originalTitle: true, year: true, tmdbId: true, contentType: true, trailerKey: true, trailerSite: true,
        genres: { select: { genre: { select: { name: true } } } },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    })

    // Small batches keep us well under TMDB's rate limit while staying fast.
    const BATCH = source === 'tmdb' ? 4 : 2
    for (let i = 0; i < movies.length; i += BATCH) {
      const batch = movies.slice(i, i + BATCH)
      const found = await Promise.all(batch.map(async (m) => {
        const movie: ProviderMovie = { ...m, genres: m.genres.map((g) => g.genre.name) }
        const candidates: ShortCandidate[] =
          source === 'tmdb' ? await fetchTmdbShorts(movie, perMovie)
          : source === 'youtube' ? await fetchYouTubeShorts(movie, perMovie)
          : catalogTrailerShort(movie)
        // Drop videos whose owner disabled embedding — they'd only show "Watch on YouTube".
        const checks = await Promise.all(candidates.map((c) => isYouTubeEmbeddable(c.videoUrl)))
        return candidates
          .filter((_, idx) => checks[idx] !== false)
          .map((c) => ({ ...c, movieId: movie.id, status: 'published' }))
      }))
      scanned += batch.length

      const data = found.flat()
      if (data.length === 0) continue
      const result = await prisma.short.createMany({ data, skipDuplicates: true }) // externalId is unique
      created += result.count
      skipped += data.length - result.count
    }
  }

  return { moviesScanned: scanned, created, skipped, sources }
}

/**
 * Re-check published YouTube shorts and hide the ones that can no longer be
 * embedded (removed / embedding disabled by the owner).
 */
export async function verifyShorts(limit = 200): Promise<{ checked: number; hidden: number }> {
  const rows = await prisma.short.findMany({
    where: { status: 'published', videoType: 'youtube' },
    select: { id: true, videoUrl: true },
    orderBy: { updatedAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 1000),
  })
  const broken: string[] = []
  for (let i = 0; i < rows.length; i += 8) {
    const batch = rows.slice(i, i + 8)
    const checks = await Promise.all(batch.map((r) => isYouTubeEmbeddable(r.videoUrl)))
    batch.forEach((r, idx) => { if (checks[idx] === false) broken.push(r.id) })
  }
  if (broken.length) {
    await prisma.short.updateMany({ where: { id: { in: broken } }, data: { status: 'hidden' } })
  }
  return { checked: rows.length, hidden: broken.length }
}
