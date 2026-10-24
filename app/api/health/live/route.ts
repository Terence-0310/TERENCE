// ============================================
// GET /api/health/live
// Liveness probe: answers 200 as soon as the HTTP server serves requests.
// Touches no database / Redis / Elasticsearch, so platform health checks
// (Render healthCheckPath) never wake Neon compute or spend Redis quota.
// Dependency status lives in GET /api/health.
// ============================================

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { status: 'ok', uptime: Math.round(process.uptime()) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
