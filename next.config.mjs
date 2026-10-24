// `output: 'standalone'` is required for the Docker/Linux production image
// (the Dockerfile copies `.next/standalone`). On Windows it breaks the build
// with `EINVAL` while copying traced chunk files whose names contain `node:`
// (the `:` is illegal in Windows filenames), made worse by the Vietnamese +
// `[ ]` characters in the project path. So enable standalone everywhere EXCEPT
// local Windows builds. Force it on with NEXT_OUTPUT_STANDALONE=1 if needed, or
// off with NEXT_OUTPUT_STANDALONE=0 (Dockerfile.render runs the custom server on .next).
const enableStandalone =
  process.env.NEXT_OUTPUT_STANDALONE === '1' ||
  (process.env.NEXT_OUTPUT_STANDALONE !== '0' && process.platform !== 'win32')

// CORS origin for /api/* in production. headers() is evaluated at build time,
// so this follows the NEXT_PUBLIC_SITE_URL the image is built with.
const productionOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
  } catch {
    return 'https://terence.com.vn'
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(enableStandalone ? { output: 'standalone' } : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // No `env:` block: it inlines values into every bundle that references them
  // (including client bundles). Server code reads process.env at runtime.
  // Compress responses
  compress: true,
  // Enable React strict mode for better dev experience
  reactStrictMode: true,
  // Power header off for security
  poweredByHeader: false,
  // Allow access from both domains
  // terence.com.vn (main) + rtc.terence.com.vn (watch party)
  async headers() {
    return [
      // Baseline security headers for every response — hosts without a reverse
      // proxy in front (e.g. Render) get them from the app itself.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Watch-party calls need camera / mic / screen share on our own origin.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()' },
          ...(process.env.NODE_ENV === 'production' && productionOrigin.startsWith('https://')
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
            : []),
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? productionOrigin
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  // Rewrites for cleaner URLs (optional)
  async rewrites() {
    return [
      // /watch-party/[code] → /xem-chung/[code] (english alias)
      {
        source: '/watch-party/:code',
        destination: '/xem-chung/:code',
      },
      {
        source: '/watch-party',
        destination: '/xem-chung',
      },
    ]
  },
}

export default nextConfig
