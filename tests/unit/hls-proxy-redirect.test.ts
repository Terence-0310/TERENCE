// hls-proxy follows redirects by hand and re-checks every hop against the
// host allowlist, so an allowed CDN cannot redirect the server to an
// internal address (SSRF).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/hls-proxy/route'

const ALLOWED = 'https://vip.opstream11.com/20240101/abc/index.m3u8'
const req = (u: string) => new NextRequest(`http://localhost/api/hls-proxy?u=${encodeURIComponent(u)}`)
const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } })

afterEach(() => vi.unstubAllGlobals())

describe('hls-proxy redirects', () => {
  it('blocks a redirect from an allowed host to an internal address', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/latest/meta-data/'))
    vi.stubGlobal('fetch', fetchMock)
    const res = await GET(req(ALLOWED))
    expect(res.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1) // the internal URL is never requested
  })

  it('follows a redirect to another allowed host and rewrites from the final URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect('https://s2.phimimg.com/path/index.m3u8'))
      .mockResolvedValueOnce(
        new Response('#EXTM3U\n#EXTINF:4,\nseg1.ts\n', { status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl' } }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const res = await GET(req(ALLOWED))
    expect(res.status).toBe(200)
    expect(fetchMock.mock.calls[1][0]).toBe('https://s2.phimimg.com/path/index.m3u8')
    expect(await res.text()).toContain(encodeURIComponent('https://s2.phimimg.com/path/seg1.ts'))
  })

  it('stops after too many redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => redirect(ALLOWED)))
    expect((await GET(req(ALLOWED))).status).toBe(502)
  })

  it('still rejects a non-allowlisted start URL', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect((await GET(req('https://evil.example.net/x.m3u8'))).status).toBe(403)
  })
})
