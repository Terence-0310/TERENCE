// ============================================
// LiveKit — Server-side Token Helper
// ============================================
// Generates short-lived JWT tokens for LiveKit room access.
// Only runs on server — secrets never exposed to client.
//
// Usage: import { generateToken, getLiveKitWsUrl } from '@/lib/livekit'

import { AccessToken } from 'livekit-server-sdk'

/**
 * Get LiveKit configuration from env.
 * Throws descriptive error if not configured.
 */
function getConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  if (!apiKey || !apiSecret) {
    throw new Error(
      'LiveKit not configured: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env',
    )
  }

  return { apiKey, apiSecret, wsUrl: wsUrl || '' }
}

/**
 * Generate a LiveKit access token for a participant.
 *
 * @param roomName - Room identifier (typically watch party roomCode)
 * @param identity - Unique participant identity (userId or guestId)
 * @param name     - Display name for the participant
 * @param ttl      - Token TTL in seconds (default: 4 hours)
 * @returns JWT token string
 */
export async function generateToken(
  roomName: string,
  identity: string,
  name: string,
  ttl: number = 14400,
): Promise<string> {
  const { apiKey, apiSecret } = getConfig()

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
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
 * Get the public LiveKit WebSocket URL for client connection.
 */
export function getLiveKitWsUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
}

/**
 * Check if LiveKit is configured (for graceful fallbacks).
 */
export function isLiveKitConfigured(): boolean {
  return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.NEXT_PUBLIC_LIVEKIT_URL)
}

/**
 * Send a server-side data message to a LiveKit room.
 * Used for system notifications like APPROVE_JOIN, REJECT_JOIN.
 */
export async function sendLiveKitDataMessage(
  roomName: string,
  payload: any,
  destinationIdentities?: string[]
): Promise<void> {
  if (!isLiveKitConfigured()) return

  const { apiKey, apiSecret, wsUrl } = getConfig()
  // Replace WebSocket protocol with HTTP for REST API
  const httpUrl = wsUrl.replace(/^ws/, 'http')
  
  const { RoomServiceClient } = await import('livekit-server-sdk')
  const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret)
  
  const data = new TextEncoder().encode(JSON.stringify(payload))
  // Send data as RELIABLE (0). 
  await svc.sendData(roomName, data, 0, { destinationIdentities, topic: 'wp-sync' })
}
