import { NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin } from '@/lib/admin/api-helpers'

// GET /api/admin/reports — system-wide content health checks
export async function GET() {
  const auth = await requireAdmin('reports.view')
  if (auth instanceof Response) return auth

  const notDeleted = { deletedAt: null }
  const select = { id: true, title: true, slug: true, status: true, createdAt: true }

  const [
    moviesMissingPoster, moviesMissingDescription, moviesMissingSource,
    brokenEpisodes,
    draftMovies,
    blockedUsers, totalUploads,
    archivedMovies, unpublishedMovies,
    recentlyUpdated, totalActive,
  ] = await Promise.all([
    prisma.movie.count({ where: { posterUrl: null, ...notDeleted } }),
    prisma.movie.count({ where: { description: null, ...notDeleted } }),
    prisma.movie.findMany({
      where: { sourceStatus: { in: ['missing', 'broken'] }, ...notDeleted },
      select, take: 50,
    }),
    prisma.episode.findMany({
      where: { status: 'broken' }, take: 50,
      select: {
        id: true, movieId: true, episodeNumber: true, sourceUrl: true,
        movie: { select: { title: true } },
      },
    }),
    prisma.movie.findMany({
      where: { status: 'draft', ...notDeleted }, take: 20,
      select: { ...select, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { status: { in: ['banned', 'blocked'] } }, take: 20,
      select: { id: true, name: true, email: true, blockedReason: true },
    }),
    prisma.upload.count(),
    prisma.movie.count({ where: { status: 'archived', ...notDeleted } }),
    prisma.movie.count({ where: { status: { not: 'published' }, ...notDeleted } }),
    prisma.movie.findMany({
      where: notDeleted, orderBy: { updatedAt: 'desc' },
      select: { ...select, updatedAt: true, updatedBy: true }, take: 10,
    }),
    prisma.movie.count({ where: notDeleted }),
  ])

  // Duplicate slug check
  const allSlugs = await prisma.movie.findMany({
    where: notDeleted,
    select: { id: true, slug: true, title: true },
  })
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
    warnings: [
      { type: 'movies_missing_poster', count: moviesMissingPoster, label: 'Phim thiếu poster' },
      { type: 'movies_missing_description', count: moviesMissingDescription, label: 'Phim thiếu mô tả' },
      { type: 'movies_broken_source', count: moviesMissingSource.length, label: 'Phim thiếu/lỗi nguồn phát', items: moviesMissingSource },
      { type: 'broken_episodes', count: brokenEpisodes.length, label: 'Tập phim lỗi nguồn', items: brokenEpisodes },
      { type: 'duplicate_slugs', count: duplicateSlugCandidates.length, label: 'Slug trùng lấp', items: duplicateSlugCandidates },
      { type: 'draft_movies', count: draftMovies.length, label: 'Phim chờ duyệt', items: draftMovies },
      { type: 'blocked_users', count: blockedUsers.length, label: 'User bị khóa', items: blockedUsers },
    ],
    summary: {
      unpublishedMovies,
      archivedMovies,
      totalActive,
      totalUploads,
    },
    recentlyUpdatedMovies: recentlyUpdated,
  })
}
