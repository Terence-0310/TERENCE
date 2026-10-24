#!/usr/bin/env node
// ============================================
// TERENCE — Render pre-deploy check (read-only)
// ============================================
// Usage:
//   node scripts/predeploy-check.mjs [--env-file .env.render] [--live]
//
// Static checks (always): required variables, URL shapes (https, onrender.com
// consistency, Neon pooled vs direct, rediss://), secret lengths, placeholders.
// --live adds read-only probes: `prisma migrate status` on DIRECT_URL, Redis
// PING, object-storage ListObjects, Elasticsearch info/count, LiveKit
// listRooms. Never writes data,
// never prints secret values.
// Exit code 1 when a blocking problem is found.

import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'

const args = process.argv.slice(2)
const envFile = args.includes('--env-file') ? args[args.indexOf('--env-file') + 1] : '.env.render'
const live = args.includes('--live')

let errors = 0
const ok = (m) => console.log(`  ✓ ${m}`)
const warn = (m) => console.log(`  ! ${m}`)
const fail = (m) => { console.log(`  ✗ ${m}`); errors++ }

function loadEnv() {
  if (!fs.existsSync(envFile)) {
    console.log(`(no ${envFile} — checking the current process environment)`)
    return { ...process.env }
  }
  const parsed = dotenv.parse(fs.readFileSync(envFile))
  // Expand ${VAR} references the same way Prisma / @next/env do.
  for (const [k, v] of Object.entries(parsed)) {
    parsed[k] = v.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => parsed[name] ?? process.env[name] ?? '')
  }
  return parsed
}

const env = loadEnv()
const get = (k) => (env[k] ?? '').trim()
const url = (k) => { try { return new URL(get(k)) } catch { return null } }
const isPlaceholder = (v) => /<[^>]+>|change-?me|example\.(com|org)/i.test(v)

console.log(`\n── Required (${envFile}) ──`)
for (const k of ['NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL', 'APP_URL', 'ALLOWED_ORIGINS', 'NEXTAUTH_SECRET', 'CRON_SECRET', 'DATABASE_URL', 'DIRECT_URL']) {
  const v = get(k)
  if (!v) fail(`${k} is empty`)
  else if (isPlaceholder(v)) fail(`${k} still contains a placeholder`)
  else ok(`${k} set`)
}
for (const k of ['NEXTAUTH_SECRET', 'CRON_SECRET', 'DATA_ENCRYPTION_KEY']) {
  if (get(k) && get(k).length < 32) fail(`${k} is shorter than 32 characters`)
}
const maxVideoMb = Number(get('MAX_VIDEO_UPLOAD_MB') || 500)
if (maxVideoMb > 60) warn(`MAX_VIDEO_UPLOAD_MB=${maxVideoMb} — uploads are buffered in RAM; use ≤40 on a 512 MB instance`)

console.log('\n── Public URLs / domain ──')
const site = url('NEXT_PUBLIC_SITE_URL')
if (site) {
  site.protocol === 'https:' ? ok(`site origin ${site.origin}`) : fail('NEXT_PUBLIC_SITE_URL must be https://')
  if (!site.hostname.endsWith('.onrender.com')) warn('site host is not *.onrender.com (fine for a custom domain)')
  for (const k of ['NEXTAUTH_URL', 'APP_URL']) {
    const u = url(k)
    if (u && u.origin !== site.origin) fail(`${k} origin differs from NEXT_PUBLIC_SITE_URL`)
  }
  const origins = get('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean)
  origins.includes(site.origin) ? ok('ALLOWED_ORIGINS contains the site origin') : fail('ALLOWED_ORIGINS must contain the site origin (Socket.IO CORS)')
  if (origins.some((o) => /localhost|127\.0\.0\.1|\*/.test(o))) fail('ALLOWED_ORIGINS contains localhost or a wildcard')
}
if (/terence\.com\.vn/.test(get('NEXTAUTH_URL') + get('APP_URL'))) warn('URLs point at terence.com.vn — intended for a Render deploy?')

console.log('\n── Neon PostgreSQL ──')
const db = url('DATABASE_URL')
const direct = url('DIRECT_URL')
if (db) {
  db.hostname.includes('-pooler') ? ok(`DATABASE_URL uses the pooled endpoint (${db.hostname})`) : fail('DATABASE_URL should be the pooled (-pooler) endpoint')
  db.searchParams.get('sslmode') === 'require' ? ok('DATABASE_URL sslmode=require') : fail('DATABASE_URL needs sslmode=require')
  const limit = Number(db.searchParams.get('connection_limit'))
  limit > 0 && limit <= 10 ? ok(`Prisma connection_limit=${limit}`) : warn('add connection_limit=5 to DATABASE_URL (Prisma otherwise sizes the pool from host CPUs)')
}
if (direct) {
  !direct.hostname.includes('-pooler') ? ok(`DIRECT_URL uses the direct endpoint (${direct.hostname})`) : fail('DIRECT_URL must NOT be the -pooler endpoint (migrations)')
  direct.searchParams.get('sslmode') === 'require' ? ok('DIRECT_URL sslmode=require') : fail('DIRECT_URL needs sslmode=require')
  if (db && db.hostname.replace('-pooler', '') !== direct.hostname) fail('DATABASE_URL and DIRECT_URL point at different Neon endpoints/branches')
}

console.log('\n── Upstash Redis ──')
const redis = url('REDIS_URL')
if (!get('REDIS_URL')) warn('REDIS_URL empty — rate limits fall back to per-instance memory')
else if (!redis) fail('REDIS_URL is not a valid URL')
else {
  redis.protocol === 'rediss:' ? ok('REDIS_URL uses rediss:// (TLS)') : fail('REDIS_URL must use rediss:// for Upstash')
  if (/^(redis|localhost|127\.0\.0\.1)$/.test(redis.hostname)) fail('REDIS_URL points at a local/Docker host')
}

console.log('\n── Neon Object Storage (uploads) ──')
const s3Keys = ['UPLOADS_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_ENDPOINT_URL_S3']
const s3Set = s3Keys.filter((k) => get(k))
if (s3Set.length === 0) fail('UPLOADS_BUCKET / AWS_* not set — uploads would go to Render\'s ephemeral disk and be lost')
else if (s3Set.length < s3Keys.length) fail(`object storage partially configured — missing ${s3Keys.filter((k) => !get(k)).join(', ')}`)
else {
  const ep = url('AWS_ENDPOINT_URL_S3')
  ep?.protocol === 'https:' ? ok(`bucket "${get('UPLOADS_BUCKET')}" at ${ep.host}`) : fail('AWS_ENDPOINT_URL_S3 must be an https:// URL')
}

console.log('\n── LiveKit Cloud ──')
const lkKeys = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'NEXT_PUBLIC_LIVEKIT_URL']
const lkSet = lkKeys.filter((k) => get(k))
if (lkSet.length === 0) warn('LiveKit not configured — watch-party voice/video disabled, everything else works')
else if (lkSet.length < lkKeys.length) fail(`LiveKit partially configured — missing ${lkKeys.filter((k) => !get(k)).join(', ')}`)
else {
  const lk = url('NEXT_PUBLIC_LIVEKIT_URL')
  lk?.protocol === 'wss:' ? ok(`NEXT_PUBLIC_LIVEKIT_URL wss://${lk.host}`) : fail('NEXT_PUBLIC_LIVEKIT_URL must be wss://')
  if (get('LIVEKIT_URL') && get('LIVEKIT_URL') !== get('NEXT_PUBLIC_LIVEKIT_URL')) warn('LIVEKIT_URL differs from NEXT_PUBLIC_LIVEKIT_URL')
}

console.log('\n── Elasticsearch (Elastic Cloud, optional) ──')
const es = url('ELASTICSEARCH_HOST')
if (!get('ELASTICSEARCH_HOST')) warn('ELASTICSEARCH_HOST empty — search uses the PostgreSQL fallback')
else if (!es) fail('ELASTICSEARCH_HOST is not a valid URL')
else {
  es.protocol === 'https:' ? ok(`ELASTICSEARCH_HOST ${es.host}`) : fail('ELASTICSEARCH_HOST must be https:// (Elastic Cloud endpoint)')
  if (/^(localhost|127\.0\.0\.1|elasticsearch)$/.test(es.hostname)) fail('ELASTICSEARCH_HOST points at a local/Docker host — not reachable from Render')
  get('ELASTICSEARCH_API_KEY') || (get('ELASTICSEARCH_USERNAME') && get('ELASTICSEARCH_PASSWORD'))
    ? ok('Elasticsearch credentials set')
    : fail('ELASTICSEARCH_API_KEY (or USERNAME/PASSWORD) required for Elastic Cloud')
}

console.log('\n── Must NOT be set on Render Free ──')
for (const k of ['SEED_ON_START', 'SYNC_KKPHIM_ON_START', 'SYNC_OPHIM_ON_START']) {
  if (get(k) && get(k) !== 'false') warn(`${k} is set — not supported on Render Free (see docs/DEPLOY_RENDER_FREE.md)`)
}
if (get('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED') === 'true' && !(get('GOOGLE_CLIENT_ID') && get('GOOGLE_CLIENT_SECRET'))) {
  fail('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true but GOOGLE_CLIENT_ID/SECRET missing')
}
if (!get('SMTP_HOST')) warn('SMTP_HOST empty — verification / reset-password emails will fail')
if (!get('SEPAY_WEBHOOK_API_KEY')) warn('SEPAY_WEBHOOK_API_KEY empty — payment webhooks rejected (top-ups disabled)')

if (live) {
  console.log('\n── Live probes (read-only) ──')
  if (direct) {
    // Run the Prisma CLI through node directly (no shell → no argument re-parsing).
    const r = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'status', '--schema=src/dta/prisma/schema.prisma'], {
      env: { ...process.env, DATABASE_URL: get('DIRECT_URL'), DIRECT_URL: get('DIRECT_URL') },
      encoding: 'utf8',
    })
    const out = `${r.stdout}\n${r.stderr}`
    if (/Database schema is up to date/.test(out)) ok('prisma migrate status: up to date')
    else if (/have not yet been applied/.test(out)) {
      const pending = out.split('\n').filter((l) => /^\d{14}_/.test(l.trim())).map((l) => l.trim())
      warn(`pending migrations: ${pending.join(', ')} — apply with approval (docs/DEPLOY_RENDER_FREE.md §4)`)
    } else if (/not managed by Prisma Migrate|P3005/.test(out)) fail('database has tables but no migration history — manual baseline required, do NOT auto-baseline')
    else fail(`prisma migrate status failed: ${(out.match(/Error:.*|P\d{4}.*/) || ['unknown'])[0].replace(/postgres(ql)?:\/\/\S+/g, '<url>')}`)
  }
  if (redis) {
    const { Redis } = await import('ioredis')
    const client = new Redis(get('REDIS_URL'), { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 8000, retryStrategy: () => null })
    client.on('error', () => {}) // reported via the rejected connect() below
    try {
      await client.connect()
      const t = Date.now()
      const pong = await client.ping()
      ok(`Redis ${pong} in ${Date.now() - t} ms (${redis.hostname})`)
    } catch (e) {
      fail(`Redis connection failed: ${e?.message?.replace(/rediss?:\/\/\S+/g, '<url>')}`)
    } finally {
      client.disconnect()
    }
  }
  if (s3Set.length === s3Keys.length) {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3')
    try {
      const s3 = new S3Client({
        endpoint: get('AWS_ENDPOINT_URL_S3'),
        region: get('AWS_REGION') || 'us-east-1',
        forcePathStyle: true,
        credentials: { accessKeyId: get('AWS_ACCESS_KEY_ID'), secretAccessKey: get('AWS_SECRET_ACCESS_KEY') },
      })
      const res = await s3.send(new ListObjectsV2Command({ Bucket: get('UPLOADS_BUCKET'), MaxKeys: 1 }))
      ok(`object storage reachable (bucket "${get('UPLOADS_BUCKET')}", ${res.KeyCount ?? 0}+ objects listed)`)
    } catch (e) {
      fail(`object storage probe failed: ${e?.name} ${e?.message}`)
    }
  }
  if (es && es.protocol === 'https:' && get('ELASTICSEARCH_API_KEY')) {
    const { Client } = await import('@elastic/elasticsearch')
    try {
      const client = new Client({ node: get('ELASTICSEARCH_HOST'), auth: { apiKey: get('ELASTICSEARCH_API_KEY') }, requestTimeout: 8000, maxRetries: 0 })
      const info = await client.info()
      const index = get('ELASTICSEARCH_INDEX_MOVIES') || 'terence_movies'
      const exists = await client.indices.exists({ index })
      const docs = exists ? (await client.count({ index })).count : 0
      ok(`Elasticsearch ${info.version?.build_flavor ?? 'default'} ${info.version?.number} — index "${index}" ${exists ? `${docs} docs` : 'not created yet (run search:reindex)'}`)
    } catch (e) {
      fail(`Elasticsearch probe failed: ${e?.meta?.statusCode ?? ''} ${e?.message}`)
    }
  }
  if (lkSet.length === lkKeys.length) {
    const { RoomServiceClient } = await import('livekit-server-sdk')
    try {
      const svc = new RoomServiceClient(get('NEXT_PUBLIC_LIVEKIT_URL').replace(/^ws/, 'http'), get('LIVEKIT_API_KEY'), get('LIVEKIT_API_SECRET'))
      const rooms = await svc.listRooms()
      ok(`LiveKit credentials valid (listRooms → ${rooms.length} active rooms)`)
    } catch (e) {
      fail(`LiveKit listRooms failed: ${e?.message}`)
    }
  }
}

console.log('')
if (errors > 0) {
  console.log(`✗ ${errors} blocking problem(s).`)
  process.exit(1)
}
console.log('✓ Pre-deploy check passed.')
