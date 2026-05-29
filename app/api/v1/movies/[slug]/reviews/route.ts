import { NextResponse } from 'next/server'
import { getReviewsByMovie } from '@/src/be/modules/reviews/reviews.service'
import { getMovieBySlug } from '@/src/be/modules/movies/movie-service'
import { prisma } from '@/src/be/shared/db/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Accept either a slug or a DB id (CUID). TMDB-only series pages pass the
    // lazy-created Movie row's id so GET (slug-based URL) and POST (id-based
    // body) resolve to the same record.
    let movie = await prisma.movie.findUnique({ where: { id: slug }, select: { id: true } }).catch(() => null)
    if (!movie) movie = await getMovieBySlug(slug)
    if (!movie) {
      return NextResponse.json({ success: true, data: [], total: 0 })
    }

    const result = await getReviewsByMovie(movie.id, page, limit)
    
    // Transform formatting to match what UI expects easily
    const now = Date.now()
    const isActive = (d: Date | null | undefined) => !!d && new Date(d).getTime() > now
    const formattedData = result.reviews.map(r => ({
      id: r.id,
      author: r.user?.name || 'Anonymous',
      avatar: r.user?.avatar,
      frameActive: isActive(r.user?.avatarFrameUntil),
      badgeActive: isActive(r.user?.exclusiveBadgeUntil),
      text: r.content,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleString('vi-VN'),
      createdAt: r.createdAt
    }))

    return NextResponse.json({ success: true, data: formattedData, total: result.total })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
