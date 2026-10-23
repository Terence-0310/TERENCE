import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// proxy.ts reads the deployment URLs once at import time, so each test sets
// env first and imports a fresh copy of the module.
async function loadProxy(env: Record<string, string>) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return (await import('@/proxy')).proxy
}

function adminPost(origin: string) {
  return new NextRequest('https://app.internal/api/admin/movies', {
    method: 'POST',
    headers: { origin, cookie: '__Secure-next-auth.session-token=abc' },
  })
}

describe('proxy CSRF origin check', () => {
  beforeEach(() => vi.unstubAllEnvs())
  afterEach(() => vi.unstubAllEnvs())

  it('accepts the built-in production domain', async () => {
    const proxy = await loadProxy({})
    const res = await proxy(adminPost('https://terence.com.vn'))
    expect(res.status).toBe(200)
  })

  it('accepts a self-hosted domain declared via NEXTAUTH_URL', async () => {
    const proxy = await loadProxy({ NEXTAUTH_URL: 'https://films.example.org' })
    const res = await proxy(adminPost('https://films.example.org'))
    expect(res.status).toBe(200)
  })

  it('accepts hosts listed in ALLOWED_ORIGINS and ignores malformed entries', async () => {
    const proxy = await loadProxy({ ALLOWED_ORIGINS: 'not a url, https://cms.example.org' })
    const res = await proxy(adminPost('https://cms.example.org'))
    expect(res.status).toBe(200)
  })

  it('rejects an undeclared origin', async () => {
    const proxy = await loadProxy({ NEXTAUTH_URL: 'https://films.example.org' })
    const res = await proxy(adminPost('https://evil.example.net'))
    expect(res.status).toBe(403)
  })
})
