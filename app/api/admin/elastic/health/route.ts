// ============================================
// GET /api/admin/elastic/health — Elasticsearch Health Check
// ============================================

import { NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/be/modules/admin/admin.guard'
import { getClient, getMoviesIndex, isAvailable } from '@/src/be/modules/search/elastic-client'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-elastic-health' })

export async function GET() {
  const guard = await requireAdmin()
  if (!isUser(guard)) return guard

  try {
    const available = await isAvailable()
    const index = getMoviesIndex()

    if (!available) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'offline',
          host: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
          index,
          message: 'Elasticsearch is not reachable',
        },
      })
    }

    const client = getClient()

    // Cluster health
    const health = await client.cluster.health()

    // Index info
    let indexInfo = null
    try {
      const exists = await client.indices.exists({ index })
      if (exists) {
        const count = await client.count({ index })
        const stats = await client.indices.stats({ index })
        indexInfo = {
          exists: true,
          documentCount: count.count,
          sizeInBytes: stats._all?.total?.store?.size_in_bytes || 0,
        }
      } else {
        indexInfo = { exists: false, documentCount: 0, sizeInBytes: 0 }
      }
    } catch {
      indexInfo = { exists: false, documentCount: 0, sizeInBytes: 0, error: 'Failed to get index info' }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: health.status, // green | yellow | red
        clusterName: health.cluster_name,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards,
        host: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
        index: {
          name: index,
          ...indexInfo,
        },
      },
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'ES health error')
    return NextResponse.json({
      success: true,
      data: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
