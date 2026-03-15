// ============================================
// Environment Configuration — typed, validated, centralized
// All env access should go through this module
// ============================================

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback
  if (!value && typeof window === 'undefined') {
    console.warn(`[ENV] ⚠️  Missing required env: ${key}`)
  }
  return value || ''
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

// ── TMDB Configuration ──

export const ENV = {
  tmdb: {
    apiKey: requireEnv('TMDB_API_KEY'),
    readAccessToken: requireEnv('TMDB_READ_ACCESS_TOKEN'),
    baseUrl: optionalEnv('TMDB_BASE_URL', 'https://api.themoviedb.org/3'),
    imageBaseUrl: optionalEnv('NEXT_PUBLIC_TMDB_IMAGE_BASE_URL', 'https://image.tmdb.org/t/p'),
    language: optionalEnv('NEXT_PUBLIC_TMDB_LANGUAGE', 'vi-VN'),
    region: optionalEnv('NEXT_PUBLIC_REGION', 'VN'),
  },

  // ── App Configuration ──
  app: {
    url: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: optionalEnv('NODE_ENV', 'development'),
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },
} as const

// ── Validation (runs once at server startup) ──

if (typeof window === 'undefined') {
  const missing: string[] = []

  if (!ENV.tmdb.apiKey && !ENV.tmdb.readAccessToken) {
    missing.push('TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN')
  }

  if (missing.length > 0) {
    console.warn(
      `\n[ENV] ⚠️  Missing environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n` +
      `Copy .env.example → .env.local and fill in your values.\n`
    )
  }
}
