// ============================================
// Unit Tests — Environment Validation
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
      expect(() => validateEnv()).toThrow('Missing required environment variables')
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
