// ============================================
// GET /api/v1/watch/[movieId]/episodes/[episodeId] — Episode playback
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getEpisodePlaybackData } from '@/server/services/playback-service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ movieId: string; episodeId: string }> },
) {
  const { episodeId } = await params

  if (!episodeId) {
    return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 })
  }

  try {
    const data = await getEpisodePlaybackData(episodeId)

    if (!data) {
      return NextResponse.json(
        { error: 'Episode not found or has no playable content' },
        { status: 404 },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] episodes/[episodeId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
