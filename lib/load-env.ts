// Side-effect module: load .env / .env.local the same way `next dev` does.
// Must be the first import of server.ts so env is ready before any other
// module (Prisma, Redis, logger) reads process.env at import time.
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')
