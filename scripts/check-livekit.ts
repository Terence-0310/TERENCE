// Probe LiveKit Cloud credentials. Used to confirm .env values match the
// project on cloud.livekit.io. Safe to keep — only reads listRooms().
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET
const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || ''

console.log('Config:')
console.log('  apiKey:', apiKey)
console.log('  apiSecret length:', apiSecret?.length)
console.log('  wsUrl:', wsUrl)

if (!apiKey || !apiSecret || !wsUrl) {
  console.error('Missing env')
  process.exit(1)
}

;(async () => {
  const at = new AccessToken(apiKey, apiSecret, { identity: 'probe-user', name: 'Probe', ttl: 600 })
  at.addGrant({ roomJoin: true, room: 'probe-room', canPublish: true, canSubscribe: true, canPublishData: true })
  const jwt = await at.toJwt()
  console.log('\nJWT length:', jwt.length)

  const httpUrl = wsUrl.replace(/^ws/, 'http')
  console.log('Probing REST API at', httpUrl)
  const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret)
  try {
    const rooms = await svc.listRooms()
    console.log('listRooms OK — credentials are VALID. Rooms:', rooms.length)
  } catch (err: any) {
    console.error('listRooms FAILED:', err?.message)
    process.exit(1)
  }
})()
