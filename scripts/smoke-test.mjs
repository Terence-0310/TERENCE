#!/usr/bin/env node
// ============================================
// TERENCE — deployment smoke test
// ============================================
// Usage:
//   node scripts/smoke-test.mjs https://<service>.onrender.com          # read-only
//   node scripts/smoke-test.mjs http://localhost:10000 --e2e            # + writes test data
//
// Read-only checks: liveness, dependency health, homepage, security headers,
// NextAuth endpoints, auth guards (admin/cron/webhook), Socket.IO polling +
// WebSocket, CORS for a foreign origin.
// --e2e (WRITES test rows — use a Neon branch / staging DB, not production):
// register + login, create a watch-party room, guest join, two realtime
// sockets (join, chat, play/pause/seek sync, disconnect + rejoin), LiveKit token.

import { io } from 'socket.io-client'

const base = (process.argv[2] || '').replace(/\/$/, '')
const e2e = process.argv.includes('--e2e')
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/smoke-test.mjs <base-url> [--e2e]')
  process.exit(2)
}

let failed = 0
const results = []
async function check(name, fn) {
  const t = Date.now()
  try {
    const detail = await fn()
    results.push(['✓', name, `${Date.now() - t} ms`, detail ?? ''])
  } catch (e) {
    failed++
    results.push(['✗', name, `${Date.now() - t} ms`, e?.message ?? String(e)])
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init })

// ── Cookie jar (NextAuth session for --e2e) ──
const jar = new Map()
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
function keepCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    jar.set(pair.slice(0, i), pair.slice(i + 1))
  }
}

// ── Read-only ──
await check('GET /api/health/live', async () => {
  const r = await req('/api/health/live')
  assert(r.status === 200, `HTTP ${r.status}`)
})
await check('GET /api/health (database must be ok)', async () => {
  const r = await req('/api/health')
  const j = await r.json()
  assert(j.checks?.database === 'ok', `database=${j.checks?.database}`)
  return `HTTP ${r.status} ${JSON.stringify(j.checks)}`
})
await check('GET / (homepage)', async () => {
  const r = await req('/')
  assert(r.status === 200, `HTTP ${r.status}`)
  const html = await r.text()
  return `${Math.round(html.length / 1024)} KB`
})
await check('Security headers', async () => {
  const r = await req('/')
  const missing = ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']
    .filter((h) => !r.headers.get(h))
  if (base.startsWith('https://') && !r.headers.get('strict-transport-security')) missing.push('strict-transport-security')
  assert(missing.length === 0, `missing: ${missing.join(', ')}`)
  assert(!r.headers.get('x-powered-by'), 'x-powered-by is exposed')
})
await check('NextAuth /api/auth/providers + csrf', async () => {
  const p = await req('/api/auth/providers')
  assert(p.status === 200, `providers HTTP ${p.status}`)
  const c = await req('/api/auth/csrf')
  assert(c.status === 200 && (await c.json()).csrfToken, `csrf HTTP ${c.status}`)
  return Object.keys(await p.json()).join(',')
})
await check('Admin API requires auth (401)', async () => {
  const r = await req('/api/admin/movies')
  assert(r.status === 401, `HTTP ${r.status}`)
})
await check('/dashboard redirects anonymous users to /login', async () => {
  const r = await req('/dashboard')
  assert([302, 307, 308].includes(r.status) && /\/login/.test(r.headers.get('location') || ''), `HTTP ${r.status}`)
})
await check('Cron endpoint rejects missing secret', async () => {
  const r = await req('/api/cron/expire-orders')
  assert(r.status === 401 || r.status === 403, `HTTP ${r.status}`)
})
await check('SePay webhook rejects missing API key', async () => {
  const r = await req('/api/payments/sepay/webhook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  assert(r.status === 401 || r.status === 403, `HTTP ${r.status}`)
})
await check('Socket.IO polling handshake', async () => {
  const r = await req('/api/socketio/?EIO=4&transport=polling')
  const body = await r.text()
  assert(r.status === 200 && body.startsWith('0{'), `HTTP ${r.status} ${body.slice(0, 60)}`)
  return JSON.parse(body.slice(1)).upgrades.join(',')
})
await check('Socket.IO CORS ignores a foreign origin', async () => {
  const r = await req('/api/socketio/?EIO=4&transport=polling', { headers: { origin: 'https://evil.example.net' } })
  const acao = r.headers.get('access-control-allow-origin')
  assert(acao !== 'https://evil.example.net' && acao !== '*', `ACAO=${acao}`)
})

function connect(extra = {}) {
  return new Promise((resolve, reject) => {
    const s = io(base, { path: '/api/socketio', transports: ['websocket'], reconnection: false, timeout: 15000, ...extra })
    s.once('connect', () => resolve(s))
    s.once('connect_error', (e) => { s.close(); reject(new Error(`connect_error: ${e.message}`)) })
  })
}
const once = (s, ev, ms = 8000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms)
  s.once(ev, (d) => { clearTimeout(t); resolve(d) })
})

await check('Socket.IO WebSocket transport', async () => {
  const s = await connect()
  const transport = s.io.engine.transport.name
  s.close()
  assert(transport === 'websocket', transport)
  return transport
})

// ── E2E (writes) ──
if (e2e) {
  const stamp = Date.now()
  const email = `smoke-${stamp}@example.com`
  const password = `Smoke!${stamp}aA`
  let room, host, guest

  await check('E2E register', async () => {
    const r = await req('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base },
      body: JSON.stringify({ email, password, name: 'Smoke Test' }),
    })
    assert(r.status === 200 || r.status === 201, `HTTP ${r.status} ${await r.text()}`)
  })
  await check('E2E login + session', async () => {
    const c = await req('/api/auth/csrf')
    keepCookies(c)
    const { csrfToken } = await c.json()
    const r = await req('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, cookie: cookieHeader() },
      body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    })
    keepCookies(r)
    const s = await req('/api/auth/session', { headers: { cookie: cookieHeader() } })
    const session = await s.json()
    assert(session?.user?.email === email, `no session (login HTTP ${r.status})`)
    return `user ${session.user.id}`
  })
  await check('E2E create watch-party room (host = signed-in user)', async () => {
    const r = await req('/api/watch-party/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base, cookie: cookieHeader() },
      body: JSON.stringify({ title: `Smoke ${stamp}`, displayName: 'Smoke Host' }),
    })
    const j = await r.json()
    assert(r.status === 201, `HTTP ${r.status} ${JSON.stringify(j)}`)
    room = j.room.code
    host = j.participant.id
    return `room ${room}`
  })
  await check('E2E guest joins room', async () => {
    const r = await req('/api/watch-party/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base },
      body: JSON.stringify({ roomCode: room, displayName: 'Smoke Guest' }),
    })
    const j = await r.json()
    assert(r.ok && j.participant?.id, `HTTP ${r.status} ${JSON.stringify(j)}`)
    guest = j.participant.id
  })

  let hs, gs
  await check('E2E realtime: both sockets join', async () => {
    hs = await connect({ extraHeaders: { cookie: cookieHeader() } })
    gs = await connect()
    hs.emit('wp:join', { roomCode: room, userId: host })
    await once(hs, 'wp:state')
    const joined = once(hs, 'wp:user-joined')
    gs.emit('wp:join', { roomCode: room, userId: guest })
    const state = await once(gs, 'wp:state')
    const j = await joined
    assert(j.participantCount === 2, `participantCount=${j.participantCount}`)
    return `host=${state.hostId === host}`
  })
  await check('E2E realtime: forged participant id is rejected', async () => {
    const s = await connect()
    s.emit('wp:join', { roomCode: room, userId: host }) // host id without the host's session
    const err = await once(s, 'wp:error')
    s.close()
    return err.message
  })
  await check('E2E realtime: chat', async () => {
    const got = once(gs, 'wp:chat-message')
    hs.emit('wp:chat', { roomCode: room, content: 'hello from smoke test' })
    const m = await got
    assert(m.content === 'hello from smoke test', 'wrong content')
  })
  await check('E2E realtime: play / pause / seek reach the guest', async () => {
    for (const [ev, t] of [['play', 1], ['pause', 2], ['seek', 42]]) {
      const got = once(gs, `wp:${ev}`)
      hs.emit(`wp:${ev}`, { roomCode: room, currentTime: t })
      const d = await got
      assert(d.currentTime === t, `${ev} currentTime=${d.currentTime}`)
    }
  })
  await check('E2E realtime: guest cannot control playback', async () => {
    gs.emit('wp:play', { roomCode: room, currentTime: 5 })
    await once(gs, 'wp:error')
  })
  await check('E2E realtime: guest disconnects and rejoins', async () => {
    gs.close()
    gs = await connect()
    gs.emit('wp:join', { roomCode: room, userId: guest })
    const state = await once(gs, 'wp:state')
    assert(state.playbackTime === 42, `playbackTime=${state.playbackTime}`)
    return 'state restored'
  })
  await check('E2E LiveKit token for an admitted participant', async () => {
    const r = await req(`/api/livekit/token?roomId=${room}&identity=${guest}`)
    const j = await r.json()
    if (r.status === 503) return 'LiveKit not configured (skipped)'
    assert(r.ok && j.token && j.url?.startsWith('wss://'), `HTTP ${r.status} ${JSON.stringify(j)}`)
    const claims = JSON.parse(Buffer.from(j.token.split('.')[1], 'base64url').toString())
    assert(claims.video?.room === room && claims.video?.roomJoin, 'grant mismatch')
    return `room=${claims.video.room} canPublish=${claims.video.canPublish}`
  })
  await check('E2E LiveKit token refused for a stranger', async () => {
    const r = await req(`/api/livekit/token?roomId=${room}&identity=not-a-participant`)
    assert(r.status >= 400 && r.status !== 503, `HTTP ${r.status}`)
  })
  hs?.close()
  gs?.close()
}

console.log(`\nSmoke test: ${base}${e2e ? '  (+e2e)' : ''}\n`)
for (const [s, n, t, d] of results) console.log(`${s} ${n.padEnd(58)} ${t.padStart(8)}  ${d}`)
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
