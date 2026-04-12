// ============================================
// Socket.IO Server Initialization — Next.js API Route
// ============================================
// GET /api/socket — initializes Socket.IO server on the same HTTP server
// This route is called once to attach Socket.IO to the Node.js HTTP server

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { registerWatchPartyHandlers } from '@/src/be/modules/watch-party/watch-party.socket'

// Global reference to prevent re-initialization
declare global {
  // eslint-disable-next-line no-var
  var _io: SocketIOServer | undefined
}

export async function GET(req: NextRequest) {
  // Socket.IO works by upgrading HTTP connections to WebSocket
  // In Next.js, we need to access the raw HTTP server
  // This is done via the (res as any).socket.server pattern

  // For Next.js App Router, we use a handshake endpoint
  // The actual Socket.IO server is initialized separately

  if (global._io) {
    return NextResponse.json({
      success: true,
      message: 'Socket.IO already initialized',
    })
  }

  return NextResponse.json({
    success: false,
    message: 'Socket.IO requires custom server. Use dev:socket script.',
    hint: 'Run: npm run dev:socket',
  })
}
