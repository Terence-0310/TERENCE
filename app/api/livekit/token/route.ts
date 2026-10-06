// ============================================
// /api/livekit/token — LiveKit Access Token API
// ============================================
// Generates LiveKit JWT tokens for watch party rooms.
// Supports both GET (query params) and POST (body).
//
// GET  ?roomId=<roomCode>&identity=<participantId>[&username=...]
// POST { roomId: <roomCode>, userId: <participantId> }
//
// A token is issued only to an admitted participant of that room; a
// participant tied to an account must also be the signed-in user. The
// LiveKit identity/name come from the participant row, never the request.
//
// Returns: { token: string, url: string }
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { generateToken, getLiveKitWsUrl, isLiveKitConfigured } from '@/lib/livekit'
import { z } from 'zod'
import { logger } from '@/src/be/shared/utils/logger'
import { prisma } from '@/src/be/shared/db/prisma'
import { AuthService } from '@/src/be/modules/auth'

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

/**
 * Resolve the caller as an admitted participant of `roomCode`, or null.
 */
async function findAuthorizedParticipant(roomCode: string, participantId: string) {
  const participant = await prisma.watchPartyParticipant.findUnique({
    where: { id: participantId },
    select: {
      id: true, userId: true, displayName: true, status: true, leftAt: true,
      room: { select: { roomCode: true, status: true } },
    },
  })
  if (!participant) return null
  if (participant.room.roomCode !== roomCode.trim().toUpperCase() || participant.room.status !== 'ACTIVE') return null
  if (participant.status !== 'ACTIVE' || participant.leftAt) return null
  if (participant.userId) {
    const caller = await AuthService.getCurrentUser()
    if (caller?.id !== participant.userId) return null
  }
  return participant
}

async function issueToken(roomCode: string, participantId: string) {
  const participant = await findAuthorizedParticipant(roomCode, participantId)
  if (!participant) {
    return NextResponse.json(
      { error: 'Bạn chưa được tham gia phòng này' },
      { status: 403 },
    )
  }
  const token = await generateToken(
    sanitize(participant.room.roomCode),
    sanitize(participant.id),
    participant.displayName,
  )
  return NextResponse.json({ token, url: getLiveKitWsUrl() })
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
    const participantId = searchParams.get('identity') || searchParams.get('userId')

    if (!roomId || !participantId) {
      return NextResponse.json(
        { error: 'Missing required params: roomId (or room), identity' },
        { status: 400 },
      )
    }

    return await issueToken(roomId, participantId)
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

    const { roomId, userId } = parsed.data
    return await issueToken(roomId, userId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    // Never log secrets, only safe error info
    log.error({ method: 'POST', err: message }, 'Token generation failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
