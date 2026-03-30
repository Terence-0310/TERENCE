// ============================================
// API Route: GET /api/watch-rooms/call/token
// ============================================
// Generates a LiveKit access token for a watch party call.
// Query: room (required), name (required), id (optional)
// Response: { token: string, wsUrl: string }
//
// SECRET: LiveKit API key/secret NEVER exposed to client.

import { NextRequest, NextResponse } from 'next/server'
import { generateLiveKitToken, getLiveKitWsUrl } from '@/lib/watch-party/call-provider'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const room = searchParams.get('room')
  const name = searchParams.get('name')
  const id = searchParams.get('id') || `user-${Date.now()}`

  if (!room || !name) {
    return NextResponse.json(
      { error: 'Missing room or name parameter' },
      { status: 400 },
    )
  }

  // Sanitize room name for LiveKit (alphanumeric + hyphens)
  const sanitizedRoom = `terence-${room.replace(/[^a-zA-Z0-9-]/g, '')}`

  try {
    const token = await generateLiveKitToken(sanitizedRoom, name, id)
    const wsUrl = getLiveKitWsUrl()

    if (!wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { token, wsUrl },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (err) {
    console.error('[call/token] Token generation failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 },
    )
  }
}
