// ============================================
// LiveKit Call Provider — Configuration & Token
// ============================================
// Server-side utilities for LiveKit integration.
// Generates short-lived access tokens for call rooms.
//
// WHY LIVEKIT:
// 1. Best React/Next.js SDK (@livekit/components-react)
// 2. Room concept built-in with participant management
// 3. Custom UI support (not iframe-based)
// 4. Free Cloud tier (10 participants, 50hr/month)
// 5. Works great for 2-4 person watch party calls
// 6. Server-side token generation = no secret leak

import { AccessToken } from 'livekit-server-sdk'

// ── Environment ──

function getLiveKitConfig() {
  return {
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
  }
}

// ── Token Generation ──

/**
 * Generate a short-lived LiveKit access token for a participant.
 *
 * @param roomName - The room to join (typically watch party code)
 * @param participantName - Display name for the participant
 * @param participantId - Unique identifier for the participant
 * @param ttl - Token TTL in seconds (default: 2 hours)
 */
export async function generateLiveKitToken(
  roomName: string,
  participantName: string,
  participantId: string,
  ttl: number = 7200,
): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig()

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key/secret not configured')
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
    ttl,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return await at.toJwt()
}

/**
 * Get the LiveKit WebSocket URL for client-side connection.
 */
export function getLiveKitWsUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
}
