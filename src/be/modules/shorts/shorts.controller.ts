// ============================================
// Shorts Controller — HTTP boundary for /api/v1/shorts and /api/admin/shorts
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/src/be/modules/auth'
import { hasPermission } from '@/src/be/modules/auth/permissions'
import { requireAdmin } from '@/src/be/shared/guards/require-auth'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { ok, created, badRequest, unauthorized, tooManyRequests, parseAndValidate, withErrorHandler } from '@/src/be/shared/api-handler'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'
import { PERMISSIONS } from '@/src/constants/permissions'
import * as ShortsService from './shorts.service'
import { getLibraryVideo, isLibraryId, listLibrary, LIBRARY_TOPICS } from './video-library.service'
import { VideoProviderError } from './video-providers/types'

type IdCtx = { params: Promise<{ id: string }> }
type CommentCtx = { params: Promise<{ id: string; commentId: string }> }

const viewLimiter = rateLimit({ windowMs: 10 * 60_000, maxRequests: 1 })   // 1 view / short / IP / 10 min
const shareLimiter = rateLimit({ windowMs: 10 * 60_000, maxRequests: 1 })
const likeLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30 })
const commentLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })
// Search / trending: generous for scrolling, but caps scripted scraping of the library.
const browseLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60 })

function intParam(v: string | null, fallback: number): number {
  const n = parseInt(v ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

// ─── Public / user ──────────────────────────────────────────────

// GET /api/v1/shorts?tab=foryou|latest|popular&seed=&skip=&limit=&movieId=
export const getFeed = withErrorHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const tab = (['foryou', 'latest', 'popular'] as const).find((t) => t === sp.get('tab')) ?? 'foryou'
  const user = await AuthService.getCurrentUser()
  const items = await ShortsService.getFeed({
    tab,
    seed: sp.get('seed') ?? undefined,
    skip: intParam(sp.get('skip'), 0),
    limit: intParam(sp.get('limit'), 10),
    movieId: sp.get('movieId') ?? undefined,
    userId: user?.id,
  })
  return ok(items)
})

// GET /api/v1/shorts/[id] — a TERENCE short, or a library video ("coverr:<id>", "mock:<id>")
export const getShort = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const { id: rawId } = await (ctx as IdCtx).params
  const id = safeDecode(rawId)
  if (isLibraryId(id)) {
    const video = await getLibraryVideo(id)
    if (!video) return NextResponse.json({ success: false, error: 'Không tìm thấy video' }, { status: 404 })
    return ok(video)
  }
  const user = await AuthService.getCurrentUser()
  const short = await ShortsService.getShortById(id, user?.id)
  if (!short) return NextResponse.json({ success: false, error: 'Không tìm thấy video' }, { status: 404 })
  return ok(short)
})

function safeDecode(v: string): string {
  try { return decodeURIComponent(v) } catch { return v }
}

const browseSchema = z.object({
  q: z.string().trim().max(100).optional(),
  scope: z.enum(['terence', 'library']).default('terence'),
  topic: z.enum(LIBRARY_TOPICS.map((t) => t.id) as [string, ...string[]]).optional(),
  cursor: z.string().regex(/^\d{1,4}$/).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(10),
})

function parseBrowse(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  return browseSchema.safeParse({
    q: sp.get('q') ?? undefined,
    scope: sp.get('scope') ?? undefined,
    topic: sp.get('topic') || undefined,
    cursor: sp.get('cursor') || undefined,
    limit: sp.get('limit') ?? undefined,
  })
}

/** Library failures degrade to an empty page with a reason instead of a 500. */
async function libraryPage(opts: Parameters<typeof listLibrary>[0]) {
  try {
    const page = await listLibrary(opts)
    return ok({ scope: 'library' as const, items: page.items, nextCursor: page.nextCursor, library: page.status })
  } catch (err) {
    if (err instanceof VideoProviderError) {
      return NextResponse.json({ success: false, error: 'Thư viện video tạm thời không khả dụng', code: 'LIBRARY_UNAVAILABLE' }, { status: 503 })
    }
    throw err
  }
}

// GET /api/v1/shorts/search?q=&scope=terence|library&topic=&cursor=&limit=
export const search = withErrorHandler(async (req: NextRequest) => {
  if (!(await browseLimiter.check(`short-browse:${getClientIdentifier(req)}`)).allowed) return tooManyRequests()
  const parsed = parseBrowse(req)
  if (!parsed.success) return badRequest('Tham số tìm kiếm không hợp lệ')
  const { q = '', scope, topic, cursor, limit } = parsed.data

  if (scope === 'library') {
    if (!q && !topic) return badRequest('Nhập từ khoá hoặc chọn chủ đề')
    return libraryPage({ sort: 'popular', query: q, topic, cursor, limit })
  }
  if (q.length < 2) return badRequest('Từ khoá cần ít nhất 2 ký tự')
  const user = await AuthService.getCurrentUser()
  const skip = Number(cursor ?? 0)
  const items = await ShortsService.searchShorts({ query: q, skip, limit, userId: user?.id })
  return ok({ scope: 'terence' as const, items, nextCursor: items.length === limit ? String(skip + limit) : null })
})

// GET /api/v1/shorts/trending?scope=library|terence&topic=&cursor=&limit=
export const trending = withErrorHandler(async (req: NextRequest) => {
  if (!(await browseLimiter.check(`short-browse:${getClientIdentifier(req)}`)).allowed) return tooManyRequests()
  const parsed = parseBrowse(req)
  if (!parsed.success) return badRequest('Tham số không hợp lệ')
  const { topic, cursor, limit } = parsed.data
  // Unlike search, this endpoint defaults to the library; TERENCE's own
  // ranking (likes, views) is only used when scope=terence is explicit.
  if (req.nextUrl.searchParams.get('scope') !== 'terence') {
    return libraryPage({ sort: 'trending', topic, cursor, limit })
  }
  const user = await AuthService.getCurrentUser()
  const skip = Number(cursor ?? 0)
  const items = await ShortsService.getFeed({ tab: 'popular', skip, limit, userId: user?.id })
  return ok({ scope: 'terence' as const, items, nextCursor: items.length === limit ? String(skip + limit) : null })
})

// POST /api/v1/shorts/[id]/like — toggle
export const toggleLike = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const user = await AuthService.getCurrentUser()
  if (!user?.id) return unauthorized('Đăng nhập để thích video')
  if (!(await likeLimiter.check(`short-like:${user.id}`)).allowed) return tooManyRequests()
  const { id } = await (ctx as IdCtx).params
  return ok(await ShortsService.toggleLike(id, user.id))
})

// POST /api/v1/shorts/[id]/view — counted at most once per IP / 10 min
export const recordView = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as IdCtx).params
  const { allowed } = await viewLimiter.check(`short-view:${getClientIdentifier(req)}:${id}`)
  if (!allowed) return ok({ counted: false })
  const viewCount = await ShortsService.incrementCounter(id, 'viewCount')
  return ok({ counted: true, viewCount })
})

// POST /api/v1/shorts/[id]/share
export const recordShare = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as IdCtx).params
  const { allowed } = await shareLimiter.check(`short-share:${getClientIdentifier(req)}:${id}`)
  if (!allowed) return ok({ counted: false })
  const shareCount = await ShortsService.incrementCounter(id, 'shareCount')
  return ok({ counted: true, shareCount })
})

// GET /api/v1/shorts/[id]/comments?skip=&limit=
export const listComments = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as IdCtx).params
  const sp = req.nextUrl.searchParams
  return ok(await ShortsService.listComments(id, Math.max(intParam(sp.get('skip'), 0), 0), intParam(sp.get('limit'), 20)))
})

const commentSchema = z.object({ content: z.string().trim().min(1, 'Nội dung không được trống').max(500) }).strict()

// POST /api/v1/shorts/[id]/comments
export const addComment = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const user = await AuthService.getCurrentUser()
  if (!user?.id) return unauthorized('Đăng nhập để bình luận')
  if (!(await commentLimiter.check(`short-comment:${user.id}`)).allowed) {
    return tooManyRequests('Bạn bình luận quá nhanh, thử lại sau ít phút')
  }
  const validation = await parseAndValidate(req, commentSchema)
  if (validation.error) return validation.error
  const { id } = await (ctx as IdCtx).params
  return created(await ShortsService.addComment(id, user.id, validation.data.content))
})

// DELETE /api/v1/shorts/[id]/comments/[commentId]
export const deleteComment = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const user = await AuthService.getCurrentUser()
  if (!user?.id) return unauthorized()
  const { id, commentId } = await (ctx as CommentCtx).params
  const canModerate = await hasPermission(user, PERMISSIONS.SHORT_MANAGE)
  await ShortsService.deleteComment(id, commentId, user.id, canModerate)
  return ok({ deleted: true })
})

// ─── Admin ──────────────────────────────────────────────────────

const adminCreateSchema = z.object({
  movieId: z.string().trim().max(50).nullable().optional(),
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
  description: z.string().max(2000).nullable().optional(),
  hashtags: z.string().max(300).nullable().optional(),
  videoType: z.enum(['youtube', 'mp4', 'hls']),
  videoUrl: z.string().trim().min(1, 'Link video là bắt buộc').max(2000),
  thumbnailUrl: z.string().trim().max(1000).nullable().optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  duration: z.number().int().min(0).max(3600).nullable().optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
}).strict()

const adminUpdateSchema = adminCreateSchema.omit({ videoType: true, videoUrl: true }).partial().strict()

const syncSchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
  source: z.enum(['tmdb', 'youtube', 'catalog', 'all']).optional(),
  perMovie: z.number().int().min(1).max(5).optional(),
  onlyMissing: z.boolean().optional(),
}).strict()

// GET /api/admin/shorts?page=&limit=&search=&status=&source=
export const adminList = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const sp = req.nextUrl.searchParams
  return ok(await ShortsService.adminList({
    page: intParam(sp.get('page'), 1),
    limit: intParam(sp.get('limit'), 20),
    search: sp.get('search') || undefined,
    status: sp.get('status') || undefined,
    source: sp.get('source') || undefined,
  }))
})

// POST /api/admin/shorts
export const adminCreate = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const validation = await parseAndValidate(req, adminCreateSchema)
  if (validation.error) return validation.error
  const short = await ShortsService.adminCreate(validation.data, auth.user.id!)
  await logAdminAction({
    actorId: auth.user.id!, action: 'create', targetType: 'short', targetId: short.id,
    metadata: { title: short.title, videoType: short.videoType }, ipAddress: getClientIp(req.headers),
  })
  return created(short)
})

// PATCH /api/admin/shorts/[id]
export const adminUpdate = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const validation = await parseAndValidate(req, adminUpdateSchema)
  if (validation.error) return validation.error
  const { id } = await (ctx as IdCtx).params
  const short = await ShortsService.adminUpdate(id, validation.data)
  await logAdminAction({
    actorId: auth.user.id!, action: 'update', targetType: 'short', targetId: id,
    metadata: validation.data, ipAddress: getClientIp(req.headers),
  })
  return ok(short)
})

// DELETE /api/admin/shorts/[id]
export const adminDelete = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const { id } = await (ctx as IdCtx).params
  await ShortsService.adminDelete(id)
  await logAdminAction({ actorId: auth.user.id!, action: 'delete', targetType: 'short', targetId: id, ipAddress: getClientIp(req.headers) })
  return ok({ deleted: true })
})

// POST /api/admin/shorts/sync — import from TMDB / YouTube
export const adminSync = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const validation = await parseAndValidate(req, syncSchema)
  if (validation.error) return validation.error
  const result = await ShortsService.syncShorts({ limit: 30, ...validation.data })
  await logAdminAction({
    actorId: auth.user.id!, action: 'sync', targetType: 'short',
    metadata: { ...validation.data, ...result }, ipAddress: getClientIp(req.headers),
  })
  return ok(result)
})

// POST /api/admin/shorts/verify — hide YouTube shorts that can no longer be embedded
export const adminVerify = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAdmin(PERMISSIONS.SHORT_MANAGE)
  if (auth instanceof Response) return auth
  const result = await ShortsService.verifyShorts()
  await logAdminAction({
    actorId: auth.user.id!, action: 'verify', targetType: 'short', metadata: result, ipAddress: getClientIp(req.headers),
  })
  return ok(result)
})
