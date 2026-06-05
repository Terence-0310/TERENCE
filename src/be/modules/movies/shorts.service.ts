// ============================================
// Shorts Service
// ============================================
// Powers the vertical "Shorts" discovery feed. Prefers real short-form entries
// (contentType = 'short'); when the catalogue has few/none, it fills the feed
// with the most-viewed published movies that have a backdrop so the feed is
// always usable. Ready to surface true shorts the moment admins add them.

import { prisma } from '@/src/be/shared/db/prisma'
import { PUBLISHED_FILTER } from './movie-service'

export interface ShortItem {
  id: string
  slug: string
  title: string
  posterUrl: string | null
  backdropUrl: string | null
  year: number | null
  rating: number | null
  contentType: string
  isShort: boolean
  description: string | null
  genres: string[]
  trailerKey: string | null
  trailerSite: string | null
}

const SHORT_SELECT = {
  id: true,
  slug: true,
  title: true,
  posterUrl: true,
  backdropUrl: true,
  year: true,
  rating: true,
  contentType: true,
  shortDescription: true,
  description: true,
  trailerKey: true,
  trailerSite: true,
  genres: { include: { genre: { select: { name: true } } } },
} as const

type ShortRow = {
  id: string; slug: string; title: string
  posterUrl: string | null; backdropUrl: string | null
  year: number | null; rating: number | null; contentType: string
  shortDescription: string | null; description: string | null
  trailerKey: string | null; trailerSite: string | null
  genres: { genre: { name: string } }[]
}

const PLACEHOLDER = '/placeholder.jpg'

function hasImage(url: string | null): boolean {
  return !!url && url !== PLACEHOLDER
}

function toItem(m: ShortRow): ShortItem {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    year: m.year,
    rating: m.rating,
    contentType: m.contentType,
    isShort: m.contentType === 'short',
    description: m.shortDescription || m.description || null,
    genres: m.genres.map((g) => g.genre.name),
    trailerKey: m.trailerKey,
    trailerSite: m.trailerSite,
  }
}

/**
 * Build the shorts feed. Real shorts first, then most-viewed movies (with a
 * usable backdrop/poster) to fill up to `limit`. `skip` enables pagination.
 */
export async function getShorts(limit = 20, skip = 0): Promise<ShortItem[]> {
  // 1. Real short-form content (when present).
  const shorts = await prisma.movie.findMany({
    where: { ...PUBLISHED_FILTER, contentType: 'short' },
    select: SHORT_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip,
  })

  let items = shorts.map(toItem)
  if (items.length >= limit) return items

  // 2. Fill with most-viewed published movies that have artwork.
  const excludeIds = shorts.map((s) => s.id)
  const fill = await prisma.movie.findMany({
    where: { ...PUBLISHED_FILTER, contentType: { not: 'short' }, id: { notIn: excludeIds } },
    select: SHORT_SELECT,
    orderBy: { viewCount: 'desc' },
    // Over-fetch so we can drop placeholder-only entries and still hit `limit`.
    take: (limit - items.length) * 2 + skip,
    skip,
  })

  const filler = fill
    .map(toItem)
    .filter((m) => hasImage(m.backdropUrl) || hasImage(m.posterUrl))
    .slice(0, limit - items.length)

  items = items.concat(filler)
  return items
}
