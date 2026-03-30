// ============================================
// Environment Variable Validation
// ============================================
// Server-side only. Validates required env vars at startup.
// Never exposes secrets to client bundle.

// ── Required server-side vars ──
const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
] as const

// ── Optional but recommended ──
const RECOMMENDED_VARS = [
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'NEXT_PUBLIC_LIVEKIT_URL',
] as const

/**
 * Validate that all required environment variables are set.
 * Call this from server startup (server.ts or instrumentation).
 */
export function validateEnv() {
  const missing: string[] = []

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n${missing.map(k => `   - ${k}`).join('\n')}\n\nCheck your .env file.`,
    )
  }

  // Warn about optional but recommended vars
  const warnings: string[] = []
  for (const key of RECOMMENDED_VARS) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `⚠️  Optional env vars not set (features may be limited):\n${warnings.map(k => `   - ${k}`).join('\n')}`,
    )
  }
}

/**
 * Get a required server-side env var. Throws if not set.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env: ${key}`)
  }
  return value
}

/**
 * LiveKit configuration (server-side only).
 * Returns null if LiveKit is not configured.
 */
export function getLiveKitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL

  if (!apiKey || !apiSecret || !wsUrl) {
    return null
  }

  return { apiKey, apiSecret, wsUrl }
}

// ── Legacy ENV accessor (backward compatibility) ──

export const ENV = {
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    readAccessToken: process.env.TMDB_READ_ACCESS_TOKEN || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
    language: 'vi-VN',
    region: process.env.NEXT_PUBLIC_REGION || 'VN',
  },
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  livekit: {
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
    isConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
  },
} as const
