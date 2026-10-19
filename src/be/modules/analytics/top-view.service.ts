// ============================================
// Top View Ranking — shared "what's hot" logic
// ============================================
// Single source of truth for the activity-based Top View ranking used by BOTH
// the public /top-view "đang thịnh hành" board and the admin dashboard table.
//
// Ranking order (professional, reflects real activity, not just all-time):
//   1) live viewers   — people currently on the watch page (socket presence)
//   2) views today    — PageView rows since 00:00 (real traffic today)
//   3) viewCount      — all-time cumulative (tie-breaker / filler)
//
// Candidate ids are unioned from all three sources so a title that is being
// watched right now OR viewed a lot today surfaces even if it isn't an
// all-time top movie; the all-time list also guarantees the board is never
// empty on a quiet local DB.

import { prisma } from '@/src/be/shared/db/prisma'
import { getTopViewedMovies } from '@/src/be/shared/realtime/notify'

export interface TopViewRankItem {
  id: string
  slug: string | null
  title: string
  posterUrl: string | null
  thumbUrl: string | null
  contentType: string
  tmdbId: number | null
  year: number | null
  rating: number | null
  viewCount: number
  viewsToday: number
  liveViewers: number
}

export async function computeTopViewRanking(limit = 12): Promise<TopViewRankItem[]> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // 1) live presence (in-memory; empty under plain `next dev` without sockets)
  const liveTop = getTopViewedMovies(limit) // [{ movieId, count }]

  // 2) most-viewed today + 3) all-time filler (candidate ids)
  const [todayTop, allTimeTop] = await Promise.all([
    prisma.pageView.groupBy({
      by: ['movieId'],
      where: { movieId: { not: null }, createdAt: { gte: startOfToday } },
      _count: { _all: true },
      orderBy: { _count: { movieId: 'desc' } },
      take: limit,
    }),
    prisma.movie.findMany({
      where: { deletedAt: null, status: 'published' },
      orderBy: { viewCount: 'desc' },
      take: Math.max(8, limit),
      select: { id: true },
    }),
  ])

  const idSet = new Set<string>()
  for (const l of liveTop) idSet.add(l.movieId)
  for (const t of todayTop) if (t.movieId) idSet.add(t.movieId)
  for (const m of allTimeTop) idSet.add(m.id)
  const candidateIds = Array.from(idSet)
  if (candidateIds.length === 0) return []

  const [metas, todayExact] = await Promise.all([
    prisma.movie.findMany({
      // Only published titles are surfaced (matches what users can open).
      where: { id: { in: candidateIds }, deletedAt: null, status: 'published' },
      select: {
        id: true, slug: true, title: true, posterUrl: true, thumbUrl: true,
        contentType: true, tmdbId: true, year: true, rating: true, viewCount: true,
      },
    }),
    prisma.pageView.groupBy({
      by: ['movieId'],
      where: { movieId: { in: candidateIds }, createdAt: { gte: startOfToday } },
      _count: { _all: true },
    }),
  ])

  const liveMap = new Map(liveTop.map((l) => [l.movieId, l.count]))
  const todayMap = new Map(todayExact.map((r) => [r.movieId, r._count._all]))

  return metas
    .map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      posterUrl: m.posterUrl,
      thumbUrl: m.thumbUrl,
      contentType: m.contentType,
      tmdbId: m.tmdbId,
      year: m.year,
      rating: m.rating,
      viewCount: m.viewCount,
      viewsToday: todayMap.get(m.id) ?? 0,
      liveViewers: liveMap.get(m.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.liveViewers - a.liveViewers ||
        b.viewsToday - a.viewsToday ||
        b.viewCount - a.viewCount,
    )
    .slice(0, limit)
}

/**
 * Wire shape for the public /top-view board — used for both the SSR seed and
 * the socket broadcast so the two can never drift (e.g. poster fallback).
 */
export function toTopViewItems(ranked: TopViewRankItem[]) {
  return ranked.map((m, i) => ({
    rank: i + 1,
    movieId: m.id,
    viewers: m.liveViewers,
    viewsToday: m.viewsToday,
    viewCount: m.viewCount,
    title: m.title,
    slug: m.slug,
    // No stored poster → resolve from TMDB through our image proxy.
    posterUrl:
      m.posterUrl ||
      m.thumbUrl ||
      (m.tmdbId ? `/api/tmdb-image/${m.tmdbId}?type=poster&isTv=${m.contentType === 'series' || m.contentType === 'tv'}` : null),
    thumbUrl: m.thumbUrl,
    contentType: m.contentType,
    tmdbId: m.tmdbId,
  }))
}
