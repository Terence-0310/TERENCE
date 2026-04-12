import { NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

// GET /api/admin/movies/reports — movie health checks
export async function GET() {
  const auth = await requireAdmin('movies.view')
  if (auth instanceof Response) return auth

  const select = { id: true, title: true, slug: true, status: true, createdAt: true }

  const [
    moviesMissingPoster, moviesMissingBackdrop, moviesMissingThumbnail,
    moviesMissingDescription, moviesMissingSource, moviesBrokenSource,
    unpublishedMovies, archivedMovies, recentlyUpdated, totalActive,
  ] = await Promise.all([
    prisma.movie.findMany({ where: { posterUrl: null, deletedAt: null }, select, take: 50 }),
    prisma.movie.findMany({ where: { backdropUrl: null, deletedAt: null }, select, take: 50 }),
    prisma.movie.findMany({ where: { thumbUrl: null, deletedAt: null }, select, take: 50 }),
    prisma.movie.findMany({ where: { description: null, deletedAt: null }, select, take: 50 }),
    prisma.movie.findMany({ where: { sourceStatus: 'missing', deletedAt: null }, select, take: 50 }),
    prisma.movie.findMany({ where: { sourceStatus: 'broken', deletedAt: null }, select, take: 50 }),
    prisma.movie.count({ where: { status: { not: 'published' }, deletedAt: null } }),
    prisma.movie.count({ where: { status: 'archived', deletedAt: null } }),
    prisma.movie.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, select: { ...select, updatedAt: true }, take: 10 }),
    prisma.movie.count({ where: { deletedAt: null } }),
  ])

  // Check duplicate slug candidates (slugs that are very similar)
  const allSlugs = await prisma.movie.findMany({ where: { deletedAt: null }, select: { id: true, slug: true, title: true } })
  const duplicateSlugCandidates: Array<{ slug: string; titles: string[] }> = []
  const slugMap = new Map<string, string[]>()
  for (const m of allSlugs) {
    const base = m.slug.replace(/-\d+$/, '')
    if (!slugMap.has(base)) slugMap.set(base, [])
    slugMap.get(base)!.push(m.title)
  }
  for (const [slug, titles] of slugMap) {
    if (titles.length > 1) duplicateSlugCandidates.push({ slug, titles })
  }

  return NextResponse.json({
    reports: [
      { key: 'moviesMissingPoster', label: 'Phim thiếu poster', count: moviesMissingPoster.length, items: moviesMissingPoster },
      { key: 'moviesMissingBackdrop', label: 'Phim thiếu backdrop', count: moviesMissingBackdrop.length, items: moviesMissingBackdrop },
      { key: 'moviesMissingThumbnail', label: 'Phim thiếu thumbnail', count: moviesMissingThumbnail.length, items: moviesMissingThumbnail },
      { key: 'moviesMissingDescription', label: 'Phim thiếu mô tả', count: moviesMissingDescription.length, items: moviesMissingDescription },
      { key: 'moviesMissingSource', label: 'Phim thiếu nguồn phát', count: moviesMissingSource.length, items: moviesMissingSource },
      { key: 'moviesBrokenSource', label: 'Phim lỗi nguồn', count: moviesBrokenSource.length, items: moviesBrokenSource },
      { key: 'duplicateSlugCandidates', label: 'Slug trùng lập tiềm năng', count: duplicateSlugCandidates.length, items: duplicateSlugCandidates },
    ],
    summary: {
      unpublishedMovies,
      archivedMovies,
      totalActive,
    },
    recentlyUpdatedMovies: recentlyUpdated,
  })
}
