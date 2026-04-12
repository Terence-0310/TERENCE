import { NextResponse } from 'next/server'
import { getMovieDetail } from '@/src/be/services/tmdb/movie-service'
import { getTvDetail } from '@/src/be/services/tmdb/tv-service'

export const revalidate = 86400 // Cache this route aggressively

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'poster'
  const isTv = searchParams.get('isTv') === 'true'
  
  if (!id || isNaN(Number(id))) {
    return NextResponse.redirect(new URL('/placeholder.jpg', request.url))
  }

  try {
    const tmdbId = Number(id)
    const detail = isTv ? await getTvDetail(tmdbId) : await getMovieDetail(tmdbId)
    
    const imageUrl = type === 'backdrop' ? detail.backdropUrl : detail.posterUrl
    
    if (imageUrl && imageUrl !== '/placeholder.jpg') {
      try {
        const imageRes = await fetch(imageUrl, { next: { revalidate: 86400 } })
        if (imageRes.ok) {
          const buffer = await imageRes.arrayBuffer()
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
            },
          })
        }
      } catch (e) {
        // Fallback below
      }
    }
  } catch (err) {
    // TMDB metadata not found
  }

  return NextResponse.redirect(new URL('/placeholder.jpg', request.url))
}
