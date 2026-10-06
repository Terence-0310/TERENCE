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
import { registerRealtimeHandlers } from './src/be/shared/realtime/socket-handlers'
import { resolveSocketUser, getSocketUser } from './src/be/shared/realtime/socket-auth'
import { expireStaleOrders } from './src/be/services/topup-order.service'
import { validateEnv } from './lib/env'
import { logger } from './src/be/shared/utils/logger'

// Fail-fast if required env vars are missing (DATABASE_URL, NEXTAUTH_SECRET).
validateEnv()

const bgLog = logger.child({ module: 'background-job' })

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Production allowed origins. Configurable via ALLOWED_ORIGINS env
// (comma-separated). Falls back to localhost-only in production if unset,
// which intentionally breaks CORS to force operators to declare origins.
function parseAllowedOrigins(): string[] | '*' {
  if (dev) return ['*']
  const raw = process.env.ALLOWED_ORIGINS?.trim()
  if (raw) {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
  console.warn(
    '[Boot] ALLOWED_ORIGINS not set — defaulting to localhost only. ' +
      'Set ALLOWED_ORIGINS to a comma-separated list for production.',
  )
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`]
}

const ALLOWED_ORIGINS = parseAllowedOrigins()

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

  // ── Handshake auth ──
  // Resolve the user from the NextAuth session cookie. Anonymous sockets are
  // allowed (live viewer counts); handlers must use socket.data.user, never a
  // client-supplied userId.
  io.use(async (socket, nextFn) => {
    socket.data.user = await resolveSocketUser(socket)
    nextFn()
  })

  // ── Connection handler ──
  io.on('connection', (socket) => {
    if (dev) {
      console.log(`[Socket.IO] Connected: ${socket.id}`)
    }

    // Per-user notification room — joined only for the authenticated user.
    // Used by webhook handlers (e.g. TCoin top-up paid) to push events to the
    // owning user without scanning all sockets. See src/be/shared/realtime/notify.ts.
    const authUser = getSocketUser(socket)
    if (authUser) socket.join(`user:${authUser.id}`)

    // Register watch party handlers
    registerWatchPartyHandlers(io, socket)

    // Register TCoin / Ads / Watch-progress / Admin-dashboard realtime
    registerRealtimeHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      if (dev) {
        console.log(`[Socket.IO] Disconnected: ${socket.id} (${reason})`)
      }
    })
  })

  // ── Background Jobs ──
  // 1. Chạy ngầm mỗi 5 phút để dọn dẹp các đơn nạp tiền đã quá hạn (15 phút)
  setInterval(() => {
    expireStaleOrders().catch((err) => {
      bgLog.error({ err: err?.message, job: 'expireStaleOrders' }, 'Failed to expire stale topup orders')
    })
  }, 5 * 60 * 1000)

  // 2. CronJob: Tự động Reindex Elasticsearch vào 2:00 sáng mỗi ngày
  let lastReindexDate = ''
  setInterval(() => {
    const now = new Date()
    const currentDate = now.toDateString()

    // Nếu đúng 2h sáng và chưa chạy trong ngày hôm nay
    if (now.getHours() === 2 && lastReindexDate !== currentDate) {
      lastReindexDate = currentDate
      bgLog.info({ job: 'elasticReindex' }, 'Starting Elasticsearch reindex (2:00 AM)')

      // Dùng dynamic import để không làm nặng server lúc khởi động
      import('./src/be/modules/search/movie-search-indexer')
        .then(({ reindexAll }) => {
          reindexAll(100)
            .then(stats =>
              bgLog.info({ job: 'elasticReindex', ...stats }, 'Elasticsearch reindex complete'),
            )
            .catch(err =>
              bgLog.error({ job: 'elasticReindex', err: err?.message }, 'Elasticsearch reindex failed'),
            )
        })
        .catch(err =>
          bgLog.error({ job: 'elasticReindex', err: err?.message }, 'Failed to load indexer module'),
        )
    }
  }, 60 * 1000) // Kiểm tra mỗi phút

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
