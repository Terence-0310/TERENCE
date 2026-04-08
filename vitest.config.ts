import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: [
        'lib/cache/**',
        'lib/api/handler.ts',
        'lib/api/rate-limit.ts',
        'lib/validators/**',
        'lib/services/**',
        'lib/repositories/**',
        'lib/auth/password.ts',
        'lib/auth/permissions.ts',
        'lib/auth/session.ts',
        'lib/tmdb-image.ts',
        'lib/tmdb/mapper.ts',
        'lib/player/time-format.ts',
        'lib/admin/validators.ts',
        'lib/env.ts',
        'lib/utils.ts',
        'src/server/movies/api-helpers.ts',
      ],
      exclude: ['node_modules', '.next'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 55,
        lines: 60,
      },
    },
    setupFiles: ['tests/helpers/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
