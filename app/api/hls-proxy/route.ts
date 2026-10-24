// ============================================
// HLS Proxy — master + variant playlists + .ts segments
// ============================================
// OPhim / KKPhim Cloudflare layer blocks direct browser fetches (HTTP 520),
// while server-side Node `fetch()` is allowed. So we proxy EVERY request
// (master, variant, segment) through this endpoint:
//   browser ── GET /api/hls-proxy?u=<absolute upstream url> ──▶ this route ──▶ OPhim
// Both playlists are rewritten so every sub-URL (variant URI, segment URI,
// key URI, init segment) points back at `/api/hls-proxy?u=<absolute>`.
//
// We also inject CODECS="avc1.64001F,mp4a.40.2" into master STREAM-INF lines
// that lack it, since OPhim master playlists omit codecs and hls.js then
// fails the audio decoder init with kUnsupportedConfig.

import { NextRequest } from 'next/server'

// Only proxy these hosts — prevents the endpoint from being used as an
// open relay.
const ALLOWED_HOST_PATTERNS = [
  /^vip\.opstream\d+\.com$/i,
  /^opstream\d+\.com$/i,
  /^phimimg\.com$/i,
  /^[a-z0-9-]+\.phimimg\.com$/i,
]

// Codec string injected when the upstream playlist omits CODECS=.
// H.264 High profile + AAC LC stereo — what OPhim CDNs actually serve.
const DEFAULT_CODECS = 'avc1.64001F,mp4a.40.2'

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOST_PATTERNS.some(p => p.test(url.hostname))
}

/** Build a same-origin proxy URL pointing at the upstream URL `abs`. */
function toProxyUrl(abs: string): string {
  return `/api/hls-proxy?u=${encodeURIComponent(abs)}`
}

/** Resolve a possibly-relative URI in a playlist against the upstream base. */
function resolveAgainst(line: string, baseHref: string): string | null {
  try {
    return new URL(line, baseHref).href
  } catch {
    return null
  }
}

/**
 * Rewrite a playlist (master OR variant) so every URI — variants, segments,
 * key= URI in EXT-X-KEY, URI= attrs in EXT-X-MEDIA / EXT-X-MAP — routes back
 * through this proxy as an absolute upstream URL.
 */
function rewritePlaylist(manifest: string, upstreamUrl: URL): string {
  const lines = manifest.split(/\r?\n/)
  const out: string[] = []
  const upstreamBase = upstreamUrl.href.substring(0, upstreamUrl.href.lastIndexOf('/') + 1)

  // Tag attributes that carry a URI — rewrite their `URI="..."` value through proxy.
  const URI_ATTR_TAGS = /^(#EXT-X-KEY:|#EXT-X-MEDIA:|#EXT-X-MAP:|#EXT-X-I-FRAME-STREAM-INF:)/i

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Inject codecs on master variant entries that omit it.
    if (line.startsWith('#EXT-X-STREAM-INF:') && !/CODECS=/i.test(line)) {
      line = line.replace(/^(#EXT-X-STREAM-INF:)(.*)$/, `$1$2,CODECS="${DEFAULT_CODECS}"`)
    }

    // Rewrite URI="..." inside tag attributes (encryption keys, audio tracks, init segments).
    if (URI_ATTR_TAGS.test(line)) {
      line = line.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = resolveAgainst(uri, upstreamBase)
        return abs ? `URI="${toProxyUrl(abs)}"` : `URI="${uri}"`
      })
      out.push(line)
      continue
    }

    // Bare URI lines (variant in master, segment in variant) — route via proxy.
    if (line && !line.startsWith('#')) {
      const abs = resolveAgainst(line, upstreamBase)
      out.push(abs ? toProxyUrl(abs) : line)
      continue
    }

    out.push(line)
  }

  return out.join('\n')
}

function looksLikePlaylist(contentType: string | null, urlPath: string): boolean {
  if (contentType && /mpegurl|x-mpegurl/i.test(contentType)) return true
  return /\.m3u8(?:$|\?)/i.test(urlPath)
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u')
  if (!u) return new Response('Missing ?u param', { status: 400 })

  let upstream: URL
  try {
    upstream = new URL(u)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }
  if (upstream.protocol !== 'https:' && upstream.protocol !== 'http:') {
    return new Response('Unsupported protocol', { status: 400 })
  }
  if (!isAllowedHost(upstream)) {
    return new Response('Host not allowed', { status: 403 })
  }

  const startedAt = Date.now()
  // Forward Range from client so byte-range requests work on segments.
  const range = req.headers.get('range')

  let upstreamRes: Response
  try {
    // Follow redirects by hand so every hop is re-checked against the host
    // allowlist — an allowed CDN must not be able to bounce us to an internal
    // address (SSRF via redirect).
    for (let hop = 0; ; hop++) {
      upstreamRes = await fetch(upstream.href, {
        headers: {
          // Mimic a real browser so Cloudflare WAF doesn't 520 us.
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': `${upstream.protocol}//${upstream.host}/`,
          ...(range ? { Range: range } : {}),
        },
        cache: 'no-store',
        redirect: 'manual',
      })
      const location = upstreamRes.status >= 300 && upstreamRes.status < 400 ? upstreamRes.headers.get('location') : null
      if (!location) break
      if (hop >= 3) return new Response('Too many redirects', { status: 502 })
      const next = new URL(location, upstream)
      if ((next.protocol !== 'https:' && next.protocol !== 'http:') || !isAllowedHost(next)) {
        return new Response('Redirect host not allowed', { status: 403 })
      }
      upstream = next
    }
  } catch (err) {
    console.error('[hls-proxy] fetch FAIL', upstream.pathname, err instanceof Error ? err.message : err)
    return new Response(`Upstream fetch failed: ${err instanceof Error ? err.message : 'unknown'}`, { status: 502 })
  }

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    console.error('[hls-proxy] upstream', upstreamRes.status, upstream.pathname)
    return new Response(`Upstream HTTP ${upstreamRes.status}`, { status: 502 })
  }

  console.log('[hls-proxy]', upstreamRes.status, upstream.pathname, `${Date.now() - startedAt}ms`)

  const ct = upstreamRes.headers.get('content-type')

  // Playlist (master or variant): read as text, rewrite all sub-URIs.
  if (looksLikePlaylist(ct, upstream.pathname)) {
    const body = await upstreamRes.text()
    const rewritten = rewritePlaylist(body, upstream)
    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        // Master playlists rarely change — cache 5 min so we don't re-fetch
        // the same playlist for every quality switch / variant load.
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Binary (.ts segments, .key files, .mp4 init segments) — stream through.
  // Cache aggressively because segment URLs are content-addressed by HLS.
  const passHeaders: Record<string, string> = {
    'Content-Type': ct || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400, immutable',
    'Access-Control-Allow-Origin': '*',
    // Tell the browser we honour Range requests so HLS.js can seek.
    'Accept-Ranges': 'bytes',
  }
  const len = upstreamRes.headers.get('content-length')
  if (len) passHeaders['Content-Length'] = len
  const cr = upstreamRes.headers.get('content-range')
  if (cr) passHeaders['Content-Range'] = cr

  return new Response(upstreamRes.body, { status: upstreamRes.status, headers: passHeaders })
}
