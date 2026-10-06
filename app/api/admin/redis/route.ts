// ============================================
// Redis Health & Diagnostics API
// ============================================
// GET  /api/admin/redis        — Health overview + cache stats
// POST /api/admin/redis        — Cache management actions (invalidate, flush)

import { NextRequest, NextResponse } from 'next/server'
import { getRedisInfo, listCacheKeys, invalidateCache, redis } from '@/src/lib/redis'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin('system.manage')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  // Health check — always available
  const health = await getRedisInfo()

  if (action === 'keys') {
    const pattern = searchParams.get('pattern') || '*'
    const limit = parseInt(searchParams.get('limit') || '50')
    const keys = await listCacheKeys(pattern, limit)
    return NextResponse.json({
      health,
      keys,
      totalShown: keys.length,
    }, {
      headers: { 'Cache-Control': 'no-cache' },
    })
  }

  // Default: return health overview
  let cacheCategories: Record<string, number> = {}
  if (redis) {
    try {
      // Count keys by category prefix
      const categories = ['movies:', 'movie:', 'playback:', 'global_', 'watchparty:', 'rl:', 'search:']
      const pipeline = redis.pipeline()
      for (const cat of categories) {
        pipeline.eval(
          "return #redis.call('keys', ARGV[1])",
          0,
          `${cat}*`
        )
      }
      const results = await pipeline.exec()
      if (results) {
        categories.forEach((cat, i) => {
          const count = results[i]?.[1] as number
          if (count && count > 0) {
            cacheCategories[cat.replace(':', '').replace('_', '')] = count
          }
        })
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({
    health,
    cacheCategories,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin('system.manage')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { action, pattern, key } = body

  if (action === 'invalidate') {
    if (!pattern && !key) {
      return NextResponse.json({ error: 'Missing pattern or key' }, { status: 400 })
    }
    const deleted = await invalidateCache(key || pattern)
    return NextResponse.json({
      success: true,
      action: 'invalidate',
      target: key || pattern,
      deletedCount: deleted,
    })
  }

  if (action === 'flush') {
    if (!redis) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
    }
    try {
      await redis.flushdb()
      return NextResponse.json({
        success: true,
        action: 'flush',
        message: 'All keys flushed from current database',
      })
    } catch {
      return NextResponse.json({ error: 'Flush failed' }, { status: 500 })
    }
  }

  if (action === 'ping') {
    if (!redis) {
      return NextResponse.json({ status: 'not_configured' }, { status: 503 })
    }
    try {
      const start = performance.now()
      const result = await redis.ping()
      const latency = Math.round((performance.now() - start) * 100) / 100
      return NextResponse.json({ result, latencyMs: latency })
    } catch {
      return NextResponse.json({ status: 'disconnected' }, { status: 503 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
