// ============================================
// GET /api/v1/watch/[movieId] — Movie playback data
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getMoviePlaybackData, getMoviePlaybackByTmdbId } from '@/server/services/playback-service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ movieId: string }> },
) {
  const { movieId } = await params

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
  }

  try {
    // Try DB lookup first (by id or slug)
    let data = await getMoviePlaybackData(movieId)

    // If not found and movieId looks like a number, try TMDB ID
    if (!data) {
      const tmdbId = Number(movieId)
      if (!isNaN(tmdbId) && tmdbId > 0) {
        data = await getMoviePlaybackByTmdbId(tmdbId)
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Movie not found or has no playable content' },
        { status: 404 },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] watch/[movieId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
