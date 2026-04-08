// ============================================
// GET /api/health — System Health Check
// ============================================
// Lightweight health endpoint for monitoring and uptime checks.
// Returns service status + optional DB connectivity check.
//
// Does NOT expose secrets or internal details.
// Sprint 5A-BE — Backend Hardening

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const timestamp = new Date().toISOString()

  // Lightweight DB connectivity check
  let dbStatus: 'ok' | 'error' = 'ok'
  try {
    // Use a cheap count query to verify DB connection
    await prisma.user.count({ take: 1 })
  } catch {
    dbStatus = 'error'
  }

  const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      success: true,
      status: overallStatus,
      service: 'terence',
      version: '1.0.0',
      timestamp,
      checks: {
        database: dbStatus,
      },
    },
    {
      status: overallStatus === 'ok' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  )
}
