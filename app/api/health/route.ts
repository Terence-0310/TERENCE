// ============================================
// GET /api/health
// System health check: database + Elasticsearch.
// Returns 200 when all systems are OK, 503 when degraded.
// ============================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // ── Database ──
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  // ── Elasticsearch ──
  try {
    const { getClient } = await import('@/src/be/modules/search/elastic-client')
    const client = getClient()
    const health = await client.cluster.health({ timeout: '3s' })
    checks.elasticsearch = health.status === 'red' ? 'degraded' : 'ok'
  } catch {
    checks.elasticsearch = 'unavailable'
  }

  // ── Redis ──
  try {
    const { redis } = await import('@/src/lib/redis')
    if (redis) {
      await redis.ping()
      checks.redis = 'ok'
    } else {
      checks.redis = 'not_configured'
    }
  } catch {
    checks.redis = 'unavailable'
  }

  const allOk = Object.values(checks).every((s) => s === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '1.0.0',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  )
}
