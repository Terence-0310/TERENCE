// ============================================
// /api/livekit/token — LiveKit Access Token API
// ============================================
// Generates LiveKit JWT tokens for watch party rooms.
// Supports both GET (query params) and POST (body).
//
// GET  ?roomId=xxx&username=xxx&identity=xxx
// POST { roomId, userId, userName, isHost }
//
// Returns: { token: string, url: string }
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { generateToken, getLiveKitWsUrl, isLiveKitConfigured } from '@/lib/livekit'
import { z } from 'zod'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'livekit-token' })

// ── Schema ──

const tokenRequestSchema = z.object({
  roomId: z.string().min(1, 'roomId is required').max(100).transform(v => v.trim()),
  userId: z.string().min(1, 'userId is required').max(100).transform(v => v.trim()),
  userName: z.string().min(1).max(50).transform(v => v.trim()).optional(),
  isHost: z.boolean().optional(),
})

// ── Helpers ──

function sanitize(value: string, maxLen = 64): string {
  return value.replace(/[^a-zA-Z0-9_\-]/g, '-').substring(0, maxLen)
}

// ── GET /api/livekit/token?roomId=xxx&username=xxx&identity=xxx ──

export async function GET(request: NextRequest) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        { error: 'LiveKit is not configured on this server' },
        { status: 503 },
      )
    }

    const { searchParams } = request.nextUrl
    const roomId = searchParams.get('roomId') || searchParams.get('room')
    const userName = searchParams.get('username')
    const userId = searchParams.get('identity') || searchParams.get('userId')

    if (!roomId || !userName) {
      return NextResponse.json(
        { error: 'Missing required params: roomId (or room), username' },
        { status: 400 },
      )
    }

    const sanitizedRoom = sanitize(roomId)
    const identity = userId ? sanitize(userId) : `user-${sanitize(userName)}`
    const token = await generateToken(sanitizedRoom, identity, userName)
    const url = getLiveKitWsUrl()

    return NextResponse.json({ token, url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    log.error({ method: 'GET', err: message }, 'Token generation failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/livekit/token ──

export async function POST(request: NextRequest) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        { error: 'LiveKit is not configured on this server' },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const parsed = tokenRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { roomId, userId, userName } = parsed.data
    const sanitizedRoom = sanitize(roomId)
    const identity = sanitize(userId)
    const name = userName || userId

    const token = await generateToken(sanitizedRoom, identity, name)
    const url = getLiveKitWsUrl()

    return NextResponse.json({ token, url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    // Never log secrets, only safe error info
    log.error({ method: 'POST', err: message }, 'Token generation failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
