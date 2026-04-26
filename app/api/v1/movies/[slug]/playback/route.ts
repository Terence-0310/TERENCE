// ============================================
// GET /api/v1/movies/[slug]/playback — Stream & Sources metadata
// ============================================

import { NextRequest } from 'next/server'
import { WatchController } from '@/src/be/modules/watch/watch.controller'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  return WatchController.getPlayback(req, context)
}
