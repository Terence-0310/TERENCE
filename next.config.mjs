/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    // Optimize image sizes for common breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/avif', 'image/webp'],
  },
  // Pass server-only env vars to server components / API routes
  env: {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN,
    TMDB_BASE_URL: process.env.TMDB_BASE_URL,
  },
  // Compress responses
  compress: true,
  // Enable React strict mode for better dev experience
  reactStrictMode: true,
  // Power header off for security
  poweredByHeader: false,
}

export default nextConfig
