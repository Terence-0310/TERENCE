// ============================================
// Advertisement Service
// ============================================
// CRUD + active-ad selection logic. Keeps ad lifecycle in one place
// so admin routes and the public player both call the same code path
// — that's the only way to guarantee "what admin previews is what user
// sees" without per-call branching.

import { prisma } from '@/src/be/shared/db/prisma'
import type { Prisma } from '@prisma/client'
import { getIo, RT_EVENTS } from '@/src/be/shared/realtime/notify'

// Broadcast to every connected client. Ads list/admin pages join the
// `ads:listeners` room — we hit both so the player can react too.
function broadcastAds(event: typeof RT_EVENTS.ADS_CREATED | typeof RT_EVENTS.ADS_UPDATED | typeof RT_EVENTS.ADS_DELETED, payload: unknown) {
  const io = getIo()
  if (!io) return
  try {
    io.to('ads:listeners').emit(event, payload)
  } catch { /* swallow — never fail on telemetry */ }
}

export const AD_TYPES = ['VIDEO', 'IMAGE', 'BANNER'] as const
export const AD_PLACEMENTS = ['PRE_ROLL', 'MID_ROLL', 'HOME_BANNER', 'DETAIL_BANNER'] as const

export type AdType = (typeof AD_TYPES)[number]
export type AdPlacement = (typeof AD_PLACEMENTS)[number]

export interface AdInput {
  title: string
  type: AdType
  placement: AdPlacement
  duration?: number | null
  mediaUrl: string
  targetUrl?: string | null
  skipAfterSeconds?: number | null
  priority?: number
  startAt?: Date | string | null
  endAt?: Date | string | null
  isActive?: boolean
}

// Bare-bones validation — Zod could replace this, but the inputs are
// small and we want admin-friendly Vietnamese error messages.
export function validateAdInput(input: Partial<AdInput>): string | null {
  if (!input.title || input.title.trim().length < 3) return 'Tiêu đề ≥ 3 ký tự'
  if (!input.type || !AD_TYPES.includes(input.type)) return 'Loại quảng cáo không hợp lệ'
  if (!input.placement || !AD_PLACEMENTS.includes(input.placement)) return 'Vị trí quảng cáo không hợp lệ'
  if (!input.mediaUrl || !/^https?:\/\//.test(input.mediaUrl)) return 'Media URL phải bắt đầu bằng http(s)://'
  if (input.targetUrl && !/^https?:\/\//.test(input.targetUrl)) return 'Target URL phải bắt đầu bằng http(s)://'
  if (input.type === 'VIDEO') {
    if (!input.duration || input.duration < 1 || input.duration > 600) return 'Video duration phải trong khoảng 1-600 giây'
  }
  if (input.skipAfterSeconds != null) {
    if (input.skipAfterSeconds < 0) return 'skipAfterSeconds không được âm'
    if (input.duration && input.skipAfterSeconds >= input.duration) return 'skipAfterSeconds phải < duration'
  }
  if (input.startAt && input.endAt) {
    const s = new Date(input.startAt).getTime()
    const e = new Date(input.endAt).getTime()
    if (Number.isFinite(s) && Number.isFinite(e) && s >= e) return 'startAt phải trước endAt'
  }
  return null
}

function normaliseInput(input: AdInput) {
  return {
    title: input.title.trim(),
    type: input.type,
    placement: input.placement,
    duration: input.duration ?? null,
    mediaUrl: input.mediaUrl.trim(),
    targetUrl: input.targetUrl?.trim() || null,
    skipAfterSeconds: input.skipAfterSeconds ?? null,
    priority: input.priority ?? 0,
    startAt: input.startAt ? new Date(input.startAt) : null,
    endAt: input.endAt ? new Date(input.endAt) : null,
    isActive: input.isActive ?? true,
  }
}

// ─── Admin CRUD ────────────────────────────────────────────────

export async function createAd(input: AdInput) {
  const err = validateAdInput(input)
  if (err) throw new Error(err)
  const ad = await prisma.advertisement.create({ data: normaliseInput(input) })
  broadcastAds(RT_EVENTS.ADS_CREATED, ad)
  return ad
}

export async function updateAd(id: string, input: Partial<AdInput>) {
  // Full validation: merge with existing row so partial updates still pass
  // VIDEO-needs-duration etc. checks.
  const existing = await prisma.advertisement.findUnique({ where: { id } })
  if (!existing) throw new Error('Không tìm thấy quảng cáo')
  const merged = { ...existing, ...input } as AdInput
  const err = validateAdInput(merged)
  if (err) throw new Error(err)

  const data: Prisma.AdvertisementUpdateInput = {}
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.type !== undefined) data.type = input.type
  if (input.placement !== undefined) data.placement = input.placement
  if (input.duration !== undefined) data.duration = input.duration
  if (input.mediaUrl !== undefined) data.mediaUrl = input.mediaUrl.trim()
  if (input.targetUrl !== undefined) data.targetUrl = input.targetUrl?.trim() || null
  if (input.skipAfterSeconds !== undefined) data.skipAfterSeconds = input.skipAfterSeconds
  if (input.priority !== undefined) data.priority = input.priority
  if (input.startAt !== undefined) data.startAt = input.startAt ? new Date(input.startAt) : null
  if (input.endAt !== undefined) data.endAt = input.endAt ? new Date(input.endAt) : null
  if (input.isActive !== undefined) data.isActive = input.isActive

  const updated = await prisma.advertisement.update({ where: { id }, data })
  broadcastAds(RT_EVENTS.ADS_UPDATED, updated)
  return updated
}

export async function deleteAd(id: string) {
  await prisma.advertisement.delete({ where: { id } })
  broadcastAds(RT_EVENTS.ADS_DELETED, { id })
}

export async function toggleAdActive(id: string) {
  const existing = await prisma.advertisement.findUnique({ where: { id } })
  if (!existing) throw new Error('Không tìm thấy quảng cáo')
  const updated = await prisma.advertisement.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })
  broadcastAds(RT_EVENTS.ADS_UPDATED, updated)
  return updated
}

export interface ListAdsFilter {
  type?: AdType
  placement?: AdPlacement
  isActive?: boolean
  search?: string
  page?: number
  limit?: number
}

export async function listAds(filter: ListAdsFilter = {}) {
  const page = Math.max(1, filter.page ?? 1)
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20))
  const skip = (page - 1) * limit

  const where: Prisma.AdvertisementWhereInput = {}
  if (filter.type) where.type = filter.type
  if (filter.placement) where.placement = filter.placement
  if (filter.isActive !== undefined) where.isActive = filter.isActive
  if (filter.search) {
    where.OR = [
      { title:     { contains: filter.search, mode: 'insensitive' } },
      { mediaUrl:  { contains: filter.search, mode: 'insensitive' } },
      { targetUrl: { contains: filter.search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.advertisement.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.advertisement.count({ where }),
  ])

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAdById(id: string) {
  return prisma.advertisement.findUnique({ where: { id } })
}

// ─── Public selection ──────────────────────────────────────────

/**
 * Pick the highest-priority ad eligible for a given placement RIGHT NOW.
 *
 * "Eligible" = active, currently inside its schedule window, and
 * matching the requested placement. Highest `priority` wins; ties
 * break by `createdAt desc` so newer ads get a fair shake.
 *
 * The caller passes `userHasAdFree` so we can short-circuit the DB
 * query for users who hold the "remove-ads-7d" perk — no point
 * spinning Postgres if we'll discard the result anyway.
 */
export async function pickActiveAd(placement: AdPlacement, opts: { userHasAdFree?: boolean } = {}) {
  if (opts.userHasAdFree) return null

  const now = new Date()
  const ad = await prisma.advertisement.findFirst({
    where: {
      placement,
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt:   null }, { endAt:   { gte: now } }] },
      ],
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
  return ad
}

// ─── Impression / event tracking ───────────────────────────────

export async function recordAdEvent(adId: string, event: 'impression' | 'skip' | 'complete' | 'click', userId?: string, placement?: string) {
  // Best-effort — never throw on tracking failures. The user experience
  // shouldn't break because we couldn't log a metric.
  try {
    await prisma.$transaction([
      prisma.adImpression.create({
        data: { adId, event, userId: userId ?? null, placement: placement ?? null },
      }),
      prisma.advertisement.update({
        where: { id: adId },
        data: event === 'click'
          ? { clickCount: { increment: 1 } }
          : event === 'impression'
            ? { impressionCount: { increment: 1 } }
            : {},
      }),
    ])
  } catch {
    /* swallow */
  }
}
