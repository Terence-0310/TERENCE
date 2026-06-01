// ============================================
// Unit Tests — Environment Validation
// ============================================

import { describe, it, expect, afterEach } from 'vitest'
import { validateEnv, getRequiredEnv, getLiveKitConfig } from '@/lib/env'

describe('lib/env', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('validateEnv()', () => {
    it('should pass when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      expect(() => validateEnv()).not.toThrow()
    })

    it('should throw when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL
      expect(() => validateEnv()).toThrow('Environment validation failed')
      expect(() => validateEnv()).toThrow('DATABASE_URL')
    })

    it('should warn about optional vars but not throw', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      delete process.env.LIVEKIT_API_KEY
      delete process.env.LIVEKIT_API_SECRET
      // Should not throw, only warn
      expect(() => validateEnv()).not.toThrow()
    })
  })

  // Regression: a prod deploy with the canonical SEPAY_WEBHOOK_API_KEY (and no
  // legacy SEPAY_WEBHOOK_SECRET) plus a polling token used to crash-loop boot
  // because validation only recognised the legacy secret name.
  describe('validateEnv() — SePay payments (production)', () => {
    function setProdBaseline() {
      // NODE_ENV is typed read-only; cast to assign it in the test.
      ;(process.env as Record<string, string>).NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgres://x'
      process.env.NEXTAUTH_SECRET = 's'
      process.env.NEXTAUTH_URL = 'https://x'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://x'
      process.env.CRON_SECRET = 'c'
    }

    it('accepts canonical SEPAY_WEBHOOK_API_KEY + polling token (the setup that previously crashed)', () => {
      setProdBaseline()
      process.env.SEPAY_API_KEY = 'token'
      process.env.SEPAY_WEBHOOK_API_KEY = 'whk'
      delete process.env.SEPAY_WEBHOOK_SECRET
      process.env.SEPAY_BANK_CODE = 'MBBank'
      process.env.SEPAY_BANK_ACCOUNT = '0385272094'
      expect(() => validateEnv()).not.toThrow()
    })

    it('still accepts the legacy SEPAY_WEBHOOK_SECRET name', () => {
      setProdBaseline()
      delete process.env.SEPAY_API_KEY
      delete process.env.SEPAY_WEBHOOK_API_KEY
      process.env.SEPAY_WEBHOOK_SECRET = 'legacy'
      process.env.SEPAY_BANK_CODE = 'MBBank'
      process.env.SEPAY_BANK_ACCOUNT = '0385272094'
      expect(() => validateEnv()).not.toThrow()
    })

    it('throws in prod when SePay is active but no webhook secret of either name', () => {
      setProdBaseline()
      process.env.SEPAY_API_KEY = 'token'
      delete process.env.SEPAY_WEBHOOK_API_KEY
      delete process.env.SEPAY_WEBHOOK_SECRET
      process.env.SEPAY_BANK_CODE = 'MBBank'
      process.env.SEPAY_BANK_ACCOUNT = '0385272094'
      expect(() => validateEnv()).toThrow('SEPAY_WEBHOOK_API_KEY')
    })
  })

  describe('getRequiredEnv()', () => {
    it('should return env value when set', () => {
      process.env.MY_TEST_VAR = 'hello'
      expect(getRequiredEnv('MY_TEST_VAR')).toBe('hello')
    })

    it('should throw when env is not set', () => {
      delete process.env.MY_TEST_VAR
      expect(() => getRequiredEnv('MY_TEST_VAR')).toThrow('Missing required env: MY_TEST_VAR')
    })

    it('should throw for empty string', () => {
      process.env.MY_TEST_VAR = ''
      expect(() => getRequiredEnv('MY_TEST_VAR')).toThrow('Missing required env')
    })
  })

  describe('getLiveKitConfig()', () => {
    it('should return null when not configured', () => {
      delete process.env.LIVEKIT_API_KEY
      delete process.env.LIVEKIT_API_SECRET
      delete process.env.NEXT_PUBLIC_LIVEKIT_URL
      expect(getLiveKitConfig()).toBeNull()
    })

    it('should return config when all vars set', () => {
      process.env.LIVEKIT_API_KEY = 'key'
      process.env.LIVEKIT_API_SECRET = 'secret'
      process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://lk.test.com'
      const config = getLiveKitConfig()
      expect(config).toEqual({
        apiKey: 'key',
        apiSecret: 'secret',
        wsUrl: 'wss://lk.test.com',
      })
    })

    it('should return null if any field missing', () => {
      process.env.LIVEKIT_API_KEY = 'key'
      delete process.env.LIVEKIT_API_SECRET
      expect(getLiveKitConfig()).toBeNull()
    })
  })
})
