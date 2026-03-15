/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
  },
  // Pass server-only env vars to server components / API routes
  env: {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN,
    TMDB_BASE_URL: process.env.TMDB_BASE_URL,
  },
}

export default nextConfig
