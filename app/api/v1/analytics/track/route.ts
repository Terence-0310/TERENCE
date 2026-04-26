// ============================================
// POST /api/v1/analytics/track
// ============================================

import { NextRequest } from 'next/server'
import { AnalyticsController } from '@/src/be/modules/analytics/analytics.controller'

export async function POST(req: NextRequest) {
  return AnalyticsController.track(req)
}
