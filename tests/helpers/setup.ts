// ============================================
// Test Setup — runs before every test file
// ============================================

// Ensure test environment variables are set
process.env.DATABASE_URL = 'file:./test.db'
process.env.NEXTAUTH_SECRET = 'test-secret-do-not-use-in-prod'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(process.env as any).NODE_ENV = 'test'
process.env.TMDB_API_KEY = 'test-api-key'
process.env.TMDB_READ_ACCESS_TOKEN = 'test-token'
process.env.TMDB_BASE_URL = 'https://api.themoviedb.org/3'
process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_REGION = 'VN'
