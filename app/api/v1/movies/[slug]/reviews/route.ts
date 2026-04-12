import { NextResponse } from 'next/server'
import { getReviewsByMovie } from '@/src/be/modules/reviews/reviews.service'
import { getMovieBySlug } from '@/src/be/modules/movies/movie-service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const movie = await getMovieBySlug(slug)
    if (!movie) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    const result = await getReviewsByMovie(movie.id, page, limit)
    
    // Transform formatting to match what UI expects easily
    const formattedData = result.reviews.map(r => ({
      id: r.id,
      author: r.user?.name || 'Anonymous',
      avatar: r.user?.avatar,
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
