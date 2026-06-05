import { NextResponse } from 'next/server'
import { getReviewsByMovie } from '@/src/be/modules/reviews/reviews.service'
import { getMovieBySlug } from '@/src/be/modules/movies/movie-service'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Accept a slug, a DB id (CUID), OR a TMDB numeric id — movie pages render
    // from TMDB and pass whichever id they have, so all three must resolve to
    // the same Movie row that POST /reviews writes to.
    let movie = await prisma.movie.findUnique({ where: { id: slug }, select: { id: true } }).catch(() => null)
    if (!movie) movie = await getMovieBySlug(slug)
    if (!movie && /^\d+$/.test(slug)) {
      movie = await prisma.movie.findFirst({ where: { tmdbId: Number(slug) }, select: { id: true } }).catch(() => null)
    }
    if (!movie) {
      return NextResponse.json({ success: true, data: [], total: 0 })
    }

    const now = Date.now()
    const isActive = (d: Date | null | undefined) => !!d && new Date(d).getTime() > now
    const fmt = (r: any, pending = false) => ({
      id: r.id,
      author: r.user?.name || 'Anonymous',
      avatar: r.user?.avatar,
      frameActive: isActive(r.user?.avatarFrameUntil),
      badgeActive: isActive(r.user?.exclusiveBadgeUntil),
      text: r.content,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleString('vi-VN'),
      createdAt: r.createdAt,
      pending,
    })

    const result = await getReviewsByMovie(movie.id, page, limit)
    const formattedData = result.reviews.map((r) => fmt(r))

    // Surface the viewer's OWN review even while it's still pending moderation,
    // so it doesn't appear to "vanish on F5" right after they post it. Only on
    // page 1, and only if it isn't already in the approved list.
    try {
      const session = await getServerSession(authOptions)
      const uid = session?.user?.id
      if (uid && page === 1) {
        const mine = await prisma.review.findUnique({
          where: { userId_movieId: { userId: uid, movieId: movie.id } },
          include: { user: { select: { name: true, avatar: true, avatarFrameUntil: true, exclusiveBadgeUntil: true } } },
        })
        if (mine && !formattedData.some((r) => r.id === mine.id)) {
          formattedData.unshift(fmt(mine, mine.status !== 'approved'))
        }
      }
    } catch { /* own-review is best-effort */ }

    return NextResponse.json({ success: true, data: formattedData, total: result.total })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
