// ============================================
// Environment Variable Validation
// ============================================
// Server-side only. Validates required env vars at startup.
// Never exposes secrets to client bundle.
//
// Behavior tiers:
//   ALWAYS REQUIRED (boot fails everywhere): DATABASE_URL, NEXTAUTH_SECRET.
//   PRODUCTION-REQUIRED (boot fails only in NODE_ENV=production): auth callback
//     URLs, payment secrets, security gates. In dev/test we tolerate missing
//     values so contributors can spin up the app without the full secret set.
//   RECOMMENDED (warned at boot, features degrade): integrations like LiveKit,
//     SMTP, Redis, TMDB. Missing them is OK in most environments.

const REQUIRED_ALWAYS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const

// Things that MUST be set in production. Listed by category so the boot log
// explains why each one matters.
const REQUIRED_IN_PRODUCTION = {
  // Auth / callback URLs
  auth: ['NEXTAUTH_URL'] as const,
  // Either APP_URL or NEXT_PUBLIC_SITE_URL must exist (boot picks whichever).
  // Tracked via a custom check below, not the simple "exists" loop.
  site: ['NEXT_PUBLIC_SITE_URL'] as const,
  // Background cron jobs (e.g. /api/cron/expire-orders) gate on this header.
  security: ['CRON_SECRET'] as const,
} as const

// "If you turn on this feature, you must also configure these."
// Boot warns when a feature group has *some* env vars but not all.
const FEATURE_GROUPS = [
  {
    name: 'SePay payments',
    detect: ['SEPAY_API_KEY', 'SEPAY_WEBHOOK_SECRET'],
    // Bank identity is now configured via SEPAY_BANK_CODE/SEPAY_BANK_ACCOUNT
    // (VIETQR_BANK_ID/VIETQR_ACCOUNT_NO are legacy aliases still accepted by
    // vietqr.ts). Either pair satisfies the QR builder, so the check below
    // is enforced in a custom rule, not by listing keys here.
    require: ['SEPAY_API_KEY', 'SEPAY_WEBHOOK_SECRET'],
  },
  {
    name: 'Elasticsearch',
    detect: ['ELASTICSEARCH_HOST'],
    require: ['ELASTICSEARCH_HOST'],
  },
  {
    name: 'Ophim sync',
    detect: ['OPHIM_BASE_URL'],
    require: ['OPHIM_BASE_URL'],
  },
  {
    name: 'KKPhim sync',
    detect: ['KKPHIM_BASE_URL'],
    require: ['KKPHIM_BASE_URL'],
  },
  {
    name: 'Turnstile CAPTCHA',
    detect: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'],
    require: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'],
  },
] as const

const RECOMMENDED_VARS = [
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'NEXT_PUBLIC_LIVEKIT_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'REDIS_URL',
  'TMDB_API_KEY',
  'ALLOWED_ORIGINS',
] as const

/**
 * Validate that required environment variables are set.
 * Call this from server startup (server.ts or instrumentation).
 */
export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production'
  const fatal: string[] = []
  const warnings: string[] = []

  // 1) Always-required.
  for (const key of REQUIRED_ALWAYS) {
    if (!process.env[key]) fatal.push(`${key} (required)`)
  }

  // 2) Production-only requirements.
  if (isProd) {
    for (const key of REQUIRED_IN_PRODUCTION.auth) {
      if (!process.env[key]) fatal.push(`${key} (required in production for auth callbacks)`)
    }
    // Site URL: accept either APP_URL or NEXT_PUBLIC_SITE_URL.
    if (!process.env.APP_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
      fatal.push('APP_URL or NEXT_PUBLIC_SITE_URL (one is required in production)')
    }
    for (const key of REQUIRED_IN_PRODUCTION.security) {
      if (!process.env[key]) fatal.push(`${key} (required in production — cron endpoints would be unauthenticated)`)
    }
  } else {
    // In dev/test: still surface missing prod-required vars as warnings so
    // contributors notice before deploy.
    const allProdKeys = [
      ...REQUIRED_IN_PRODUCTION.auth,
      ...REQUIRED_IN_PRODUCTION.security,
      ...REQUIRED_IN_PRODUCTION.site,
    ]
    for (const key of allProdKeys) {
      if (!process.env[key]) warnings.push(`${key} (production-only requirement)`)
    }
  }

  // 3) Feature-group consistency: if any detect-key is set, all require-keys must be set.
  for (const group of FEATURE_GROUPS) {
    const detected = group.detect.some((k) => !!process.env[k])
    if (!detected) continue
    const missing = group.require.filter((k) => !process.env[k])
    if (missing.length > 0) {
      const msg = `Feature "${group.name}" partially configured — missing: ${missing.join(', ')}`
      if (isProd) fatal.push(msg)
      else warnings.push(msg)
    }
  }

  // 3b) SePay bank identity: accept either SEPAY_BANK_* or VIETQR_* pair.
  // We only warn/fatal when SePay is detected as active (has API key).
  const sepayActive = !!process.env.SEPAY_API_KEY || !!process.env.SEPAY_WEBHOOK_SECRET
  if (sepayActive) {
    const hasSepayPair = !!process.env.SEPAY_BANK_CODE && !!process.env.SEPAY_BANK_ACCOUNT
    const hasLegacyPair = !!process.env.VIETQR_BANK_ID && !!process.env.VIETQR_ACCOUNT_NO
    if (!hasSepayPair && !hasLegacyPair) {
      const msg = 'SePay payments: set SEPAY_BANK_CODE + SEPAY_BANK_ACCOUNT (or legacy VIETQR_BANK_ID + VIETQR_ACCOUNT_NO)'
      if (isProd) fatal.push(msg)
      else warnings.push(msg)
    }
  }

  // 4) Recommended-but-optional integrations.
  for (const key of RECOMMENDED_VARS) {
    if (!process.env[key]) warnings.push(key)
  }

  if (fatal.length > 0) {
    throw new Error(
      `❌ Environment validation failed:\n${fatal.map((k) => `   - ${k}`).join('\n')}\n\nFix your .env (see .env.example).`,
    )
  }

  if (warnings.length > 0) {
    console.warn(
      `⚠️  Env vars not set (features may be limited):\n${warnings.map((k) => `   - ${k}`).join('\n')}`,
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
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000',
  },
  livekit: {
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
    isConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
  },
} as const
