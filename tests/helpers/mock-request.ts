// ============================================
// Integration Test Helper — mock Next.js request builder
// ============================================

import { NextRequest } from 'next/server'

/**
 * Build a mock NextRequest for integration testing API routes.
 */
export function createMockRequest(
  path: string,
  options: {
    method?: string
    searchParams?: Record<string, string>
    body?: unknown
    headers?: Record<string, string>
  } = {},
): NextRequest {
  const { method = 'GET', searchParams = {}, body, headers = {} } = options

  const url = new URL(path, 'http://localhost:3000')
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(url, init as any)
}

/**
 * Parse the JSON body of a NextResponse for assertion.
 */
export async function parseResponse<T = unknown>(res: Response): Promise<{
  status: number
  body: T
}> {
  const body = await res.json() as T
  return { status: res.status, body }
}
