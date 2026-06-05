// ============================================
// Seek-bar Thumbnail Preview — on-demand sprite + WebVTT generator
// ============================================
// Generates a single sprite sheet (grid of small JPEG frames) plus a WebVTT
// file that maps playback time → a region of the sprite (#xywh). The custom
// player loads the VTT and shows the matching frame when the user hovers the
// seek bar.
//
// Why on-demand (lazy) instead of pre-generating all 61k titles: the videos
// are hosted on external OPhim CDNs (we don't store them), so we extract
// frames with ffmpeg only when a title is first watched, then cache the
// sprite+VTT under public/uploads so every later viewer gets it instantly.
//
// ffmpeg uses INPUT seeking (`-ss` before `-i`) so each frame downloads only
// the HLS segment around that timestamp — proven to work against OPhim HLS.

import { spawn } from 'child_process'
import { mkdir, access, writeFile, rm, rename } from 'fs/promises'
import path from 'path'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'thumbnail-service' })

const THUMBS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'thumbs')
const PUBLIC_BASE = '/uploads/thumbs'

// Sprite geometry. Small frames keep the sheet light (a 2h film → ~120 frames
// → ~one ~1600×1080 JPEG, a few hundred KB).
const COLS = 10
const THUMB_W = 160
const THUMB_H = 90
const MAX_THUMBS = 120 // cap frames so generation stays bounded on long films
const MIN_INTERVAL = 5 // seconds — finest granularity
const EXTRACT_CONCURRENCY = 4
const FRAME_TIMEOUT_MS = 25_000

// In-process guard so two concurrent requests for the same episode don't both
// spawn ffmpeg. (A `.lock` file additionally guards across process restarts.)
const inFlight = new Set<string>()

export interface ThumbnailStatus {
  status: 'ready' | 'generating' | 'none'
  vttUrl?: string
  spriteUrl?: string
}

/** Filesystem-safe key for an episode identifier (slug/number/"full"). */
function epKey(ep: string | null | undefined): string {
  const k = (ep || 'full').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  return k || 'full'
}

function dirFor(movieId: string, ep: string | null | undefined) {
  const safeMovie = movieId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
  const key = epKey(ep)
  return {
    abs: path.join(THUMBS_ROOT, safeMovie, key),
    pub: `${PUBLIC_BASE}/${safeMovie}/${key}`,
  }
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

/** Run a command, resolving with stdout; rejects on non-zero exit or timeout. */
function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', (d) => { out += d.toString() })
    child.stderr.on('data', (d) => { err += d.toString() })
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(out)
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(-300)}`))
    })
  })
}

async function probeDuration(url: string): Promise<number> {
  const out = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    url,
  ], 30_000)
  const dur = parseFloat(out.trim().split('\n')[0])
  return Number.isFinite(dur) && dur > 0 ? dur : 0
}

function secToVtt(t: number): string {
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t - Math.floor(t)) * 1000)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      try { await fn(items[i], i) } catch { /* per-frame failures tolerated */ }
    }
  })
  await Promise.all(workers)
}

/** Check whether a ready sprite+VTT already exists (or is being generated). */
export async function getThumbnailStatus(movieId: string, ep: string | null | undefined): Promise<ThumbnailStatus> {
  const { abs, pub } = dirFor(movieId, ep)
  if (await exists(path.join(abs, 'sprite.jpg')) && await exists(path.join(abs, 'thumbs.vtt'))) {
    return { status: 'ready', vttUrl: `${pub}/thumbs.vtt`, spriteUrl: `${pub}/sprite.jpg` }
  }
  if (inFlight.has(abs) || await exists(path.join(abs, '.lock'))) {
    return { status: 'generating' }
  }
  return { status: 'none' }
}

/**
 * Generate sprite.jpg + thumbs.vtt for one episode stream. Idempotent: returns
 * the existing sprite if present, and no-ops if another run is in flight.
 */
export async function generateThumbnails(
  movieId: string,
  ep: string | null | undefined,
  streamUrl: string,
): Promise<ThumbnailStatus> {
  const { abs, pub } = dirFor(movieId, ep)
  const spritePath = path.join(abs, 'sprite.jpg')
  const vttPath = path.join(abs, 'thumbs.vtt')

  if (await exists(spritePath) && await exists(vttPath)) {
    return { status: 'ready', vttUrl: `${pub}/thumbs.vtt`, spriteUrl: `${pub}/sprite.jpg` }
  }
  if (inFlight.has(abs)) return { status: 'generating' }
  inFlight.add(abs)

  const tmp = path.join(abs, 'tmp')
  try {
    await mkdir(tmp, { recursive: true })
    await writeFile(path.join(abs, '.lock'), String(Date.now())).catch(() => {})

    const duration = await probeDuration(streamUrl)
    if (!duration) throw new Error('could not probe duration')

    const interval = Math.max(MIN_INTERVAL, Math.ceil(duration / MAX_THUMBS))
    const times: number[] = []
    for (let t = 0; t < duration && times.length < MAX_THUMBS; t += interval) times.push(t)

    // Extract each frame independently via input-seek (fast on HLS VOD).
    const ok: { t: number; file: string }[] = []
    await mapLimit(times, EXTRACT_CONCURRENCY, async (t, i) => {
      const file = path.join(tmp, `f_${String(i).padStart(4, '0')}.jpg`)
      await run('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-ss', String(t), '-i', streamUrl,
        '-frames:v', '1',
        '-vf', `scale=${THUMB_W}:${THUMB_H}:force_original_aspect_ratio=increase,crop=${THUMB_W}:${THUMB_H}`,
        '-q:v', '5',
        file,
      ], FRAME_TIMEOUT_MS)
      if (await exists(file)) ok.push({ t, file })
    })

    if (ok.length === 0) throw new Error('no frames extracted')
    ok.sort((a, b) => a.t - b.t)

    // Renumber to a contiguous sequence so ffmpeg's tile filter sees no gaps.
    for (let i = 0; i < ok.length; i++) {
      const seq = path.join(tmp, `s_${String(i).padStart(5, '0')}.jpg`)
      await rename(ok[i].file, seq)
    }

    const rows = Math.ceil(ok.length / COLS)
    await run('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-framerate', '1',
      '-i', path.join(tmp, 's_%05d.jpg'),
      '-frames:v', '1',
      '-filter_complex', `tile=${COLS}x${rows}:padding=0:margin=0`,
      '-q:v', '5',
      spritePath,
    ], 60_000)

    // Build the WebVTT. Each cue spans [t, nextT) and points at the frame's
    // cell in the sprite via the media-fragment #xywh syntax.
    let vtt = 'WEBVTT\n\n'
    for (let i = 0; i < ok.length; i++) {
      const start = ok[i].t
      const end = i + 1 < ok.length ? ok[i + 1].t : Math.min(duration, start + interval)
      const x = (i % COLS) * THUMB_W
      const y = Math.floor(i / COLS) * THUMB_H
      vtt += `${secToVtt(start)} --> ${secToVtt(end)}\n`
      vtt += `sprite.jpg#xywh=${x},${y},${THUMB_W},${THUMB_H}\n\n`
    }
    await writeFile(vttPath, vtt, 'utf8')

    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    await rm(path.join(abs, '.lock'), { force: true }).catch(() => {})

    log.info({ movieId, ep, frames: ok.length, duration: Math.round(duration) }, 'Thumbnails generated')
    return { status: 'ready', vttUrl: `${pub}/thumbs.vtt`, spriteUrl: `${pub}/sprite.jpg` }
  } catch (e) {
    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    await rm(path.join(abs, '.lock'), { force: true }).catch(() => {})
    log.warn({ movieId, ep, err: e instanceof Error ? e.message : e }, 'Thumbnail generation failed')
    return { status: 'none' }
  } finally {
    inFlight.delete(abs)
  }
}
