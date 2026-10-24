// ============================================
// Annotate TMDB "related" movies with watchability
// ============================================
// The "Phim tương tự" rows come from TMDB and include titles we don't host
// (trailer-only). Rather than hide them (which would thin the row), we mark
// each one: titles that exist in our published catalogue link straight to the
// player; the rest get isExternal=true so the card shows a "Trailer" badge —
// the user keeps the rich discovery row but is never misled.
//
// After the catalogue cleanup, `status='published' AND deletedAt IS NULL`
// already implies the movie has a real source, so a single id lookup suffices.

import { prisma } from '@/src/be/shared/db/prisma'
import type { Movie } from '@/types/movie'

export async function annotateRelatedWatchable(related: Movie[] | undefined): Promise<Movie[]> {
  if (!related?.length) return related ?? []
  const tmdbIds = related
    .map((m) => m.id)
    .filter((x): x is number => typeof x === 'number' && x > 0)
  if (!tmdbIds.length) return related.map((m) => ({ ...m, isExternal: true }))

  const rows = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds }, status: 'published', deletedAt: null },
    select: { tmdbId: true, slug: true },
  }).catch(() => [])

  const slugByTmdb = new Map<number, string>()
  for (const r of rows) if (r.tmdbId) slugByTmdb.set(r.tmdbId, r.slug)

  return related.map((m) => {
    const slug = slugByTmdb.get(m.id)
    if (slug) return { ...m, slug, customUrl: `/movie/${slug}`, isExternal: false }
    return { ...m, isExternal: true }
  })
}
