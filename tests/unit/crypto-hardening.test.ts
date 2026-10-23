// ============================================
// Unit tests — crypto hardening
// ============================================
// - metadata encryption: round-trip, GCM tag truncation rejected, no
//   hardcoded fallback key, data written before the change still decrypts
// - password-reset tokens: only the SHA-256 digest is stored

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { encryptMetadata, decryptMetadata } from '@/src/be/shared/utils/encryption'
import { generateResetToken, hashResetToken } from '@/src/be/modules/auth/reset-token'

beforeEach(() => vi.stubEnv('NEXTAUTH_SECRET', 'unit-test-secret-0123456789abcdef'))
afterEach(() => vi.unstubAllEnvs())

describe('metadata encryption', () => {
  it('round-trips an object', () => {
    const enc = encryptMetadata({ description: 'Nạp TCoin', referenceType: null })
    expect(enc._encrypted).toBe(true)
    expect(decryptMetadata(enc)).toEqual({ description: 'Nạp TCoin', referenceType: null })
  })

  it('rejects a truncated auth tag (GCM forgery hardening)', () => {
    const enc = encryptMetadata({ a: 1 })
    const short = Buffer.from(enc.authTag, 'base64').subarray(0, 4).toString('base64')
    expect(decryptMetadata({ ...enc, authTag: short })).toHaveProperty('error')
  })

  it('still decrypts records written before the change (default 16-byte tag)', () => {
    const key = crypto.createHash('sha256').update('unit-test-secret-0123456789abcdef').digest()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const data = cipher.update(JSON.stringify({ legacy: true }), 'utf8', 'base64') + cipher.final('base64')
    const legacy = { _encrypted: true, data, iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') }
    expect(decryptMetadata(legacy)).toEqual({ legacy: true })
  })

  it('never encrypts with a built-in key when NEXTAUTH_SECRET is missing', () => {
    vi.stubEnv('NEXTAUTH_SECRET', '')
    const meta = { a: 1 }
    expect(encryptMetadata(meta)).toBe(meta) // existing fail-open behaviour: stored unencrypted, not under a public key
  })
})

describe('password reset tokens', () => {
  it('stores a SHA-256 digest that differs from the emailed token', () => {
    const { token, tokenHash } = generateResetToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(tokenHash).toBe(crypto.createHash('sha256').update(token).digest('hex'))
    expect(tokenHash).not.toBe(token)
    expect(hashResetToken(token)).toBe(tokenHash)
  })
})
