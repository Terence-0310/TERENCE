// ============================================
// Custom Server — Next.js + Socket.IO (Production Ready)
// ============================================
// Usage:
//   Dev:  npx tsx server.ts
//   Prod: node server.js  (after build with ts-node/tsx)
//
// Wraps Next.js with Socket.IO for real-time watch party sync.

import { createServer } from 'http'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { registerWatchPartyHandlers } from './src/be/modules/watch-party/watch-party.socket'
import { expireStaleOrders } from './src/be/services/topup-order.service'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Production allowed origins
const ALLOWED_ORIGINS = dev
  ? ['*']
  : [
      'https://terence.com.vn',
      'https://www.terence.com.vn',
      'https://rtc.terence.com.vn',
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]

const app = next({ dev, hostname: dev ? 'localhost' : hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  // ── Initialize Socket.IO ──
  const io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Performance tuning
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
    // Production: prefer websocket
    allowUpgrades: true,
  })

  // Store global reference
  ;(global as any)._io = io

  // ── Connection handler ──
  io.on('connection', (socket) => {
    if (dev) {
      console.log(`[Socket.IO] Connected: ${socket.id}`)
    }

    // Register watch party handlers
    registerWatchPartyHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      if (dev) {
        console.log(`[Socket.IO] Disconnected: ${socket.id} (${reason})`)
      }
    })
  })

  // ── Background Jobs ──
  // Chạy ngầm mỗi 5 phút để dọn dẹp các đơn nạp tiền đã quá hạn (15 phút)
  setInterval(() => {
    expireStaleOrders().catch((err) => {
      console.error('[Background Job] Lỗi huỷ đơn hết hạn:', err)
    })
  }, 5 * 60 * 1000)

  // ── Start server ──
  httpServer.listen(port, hostname === '0.0.0.0' ? undefined : hostname, () => {
    console.log(`\n✅ TERENCE Server ready:`)
    console.log(`   🌐 Web:      http://${hostname}:${port}`)
    console.log(`   🔌 Socket:   ws://${hostname}:${port}/api/socketio`)
    console.log(`   📡 Mode:     ${dev ? 'Development' : 'Production'}`)
    if (!dev) {
      console.log(`   🎬 RTC:      https://rtc.terence.com.vn`)
    }
    console.log('')
  })
})
