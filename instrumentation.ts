// Next.js boot hook — runs once per server instance, before any request.
// Used to fail-fast if required env vars are missing.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { validateEnv } = await import('./lib/env')
  validateEnv()
}
