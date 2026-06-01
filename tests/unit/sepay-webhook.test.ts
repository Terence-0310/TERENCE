// ============================================
// Unit tests — SePay auth + extractOrderCode + tag constants
// ============================================
// We test only the pure helpers here. End-to-end webhook flow needs a real
// Prisma + ES setup and lives in the docker smoke test.

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  verifySePayAuth,
  verifySePaySignature,
  extractOrderCode,
  normalizeBankContent,
  contentMatchesTransfer,
  SEPAY_LOG_TAGS,
} from '@/src/be/modules/payments/sepay'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  delete process.env.SEPAY_WEBHOOK_API_KEY
  delete process.env.SEPAY_WEBHOOK_SECRET
})

afterAll(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('verifySePayAuth()', () => {
  it('accepts when no secret is configured (dev mode)', () => {
    const h = new Headers()
    expect(verifySePayAuth(h)).toBe(true)
  })

  it('reads SEPAY_WEBHOOK_API_KEY first', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'k1'
    process.env.SEPAY_WEBHOOK_SECRET  = 'k2'
    const h = new Headers({ Authorization: 'Apikey k1' })
    expect(verifySePayAuth(h)).toBe(true)
    const wrong = new Headers({ Authorization: 'Apikey k2' })
    expect(verifySePayAuth(wrong)).toBe(false)
  })

  it('falls back to SEPAY_WEBHOOK_SECRET when API_KEY missing', () => {
    process.env.SEPAY_WEBHOOK_SECRET = 'legacy-secret'
    const h = new Headers({ Authorization: 'Apikey legacy-secret' })
    expect(verifySePayAuth(h)).toBe(true)
  })

  it('accepts all four documented auth shapes', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'topsecret'
    const shapes: Array<Record<string, string>> = [
      { Authorization: 'Apikey topsecret' },
      { Authorization: 'Bearer topsecret' },
      { Authorization: 'topsecret' },
      { 'x-api-key': 'topsecret' },
    ]
    for (const h of shapes) {
      expect(verifySePayAuth(new Headers(h))).toBe(true)
    }
  })

  it('rejects mismatched secret', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'right'
    expect(verifySePayAuth(new Headers({ Authorization: 'Apikey wrong' }))).toBe(false)
    expect(verifySePayAuth(new Headers({ 'x-api-key': 'wrong' }))).toBe(false)
    expect(verifySePayAuth(new Headers())).toBe(false)
  })
})

describe('verifySePaySignature() — legacy wrapper', () => {
  it('keeps backward-compat behaviour with raw header string', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'k'
    expect(verifySePaySignature({}, 'Apikey k')).toBe(true)
    expect(verifySePaySignature({}, 'Bearer k')).toBe(true)
    expect(verifySePaySignature({}, 'k')).toBe(true)
    expect(verifySePaySignature({}, 'wrong')).toBe(false)
    expect(verifySePaySignature({}, null)).toBe(false)
  })
})

describe('extractOrderCode()', () => {
  it('finds TCOIN_ code anywhere in the bank content', () => {
    expect(extractOrderCode('chuyen khoan TCOIN_ABCD1234')).toBe('TCOIN_ABCD1234')
    expect(extractOrderCode('TCOIN_ABC123 thanh toan')).toBe('TCOIN_ABC123')
    expect(extractOrderCode('CT DEN:0123 TCOIN_U6_TS_42 GHI CHU')).toBe('TCOIN_U6_TS_42')
  })

  it('supports the new userId_timestamp format with underscores', () => {
    expect(extractOrderCode('TCOIN_ABCDEF_LX12NK')).toBe('TCOIN_ABCDEF_LX12NK')
  })

  it('still extracts when the bank strips the underscore (real MBBank memo)', () => {
    // Banks like MBBank deliver "TCOIN_PDFYZ3SE" as "TCOINPDFYZ3SE".
    expect(extractOrderCode('TCOINPDFYZ3SE   Ma giao dich  Trace090976')).toBe('TCOINPDFYZ3SE')
  })

  it('uppercases the matched code', () => {
    expect(extractOrderCode('tcoin_abc123')).toBe('TCOIN_ABC123')
  })

  it('returns null when no code is present', () => {
    expect(extractOrderCode('chuyen khoan binh thuong')).toBeNull()
    expect(extractOrderCode('')).toBeNull()
    expect(extractOrderCode(null)).toBeNull()
    expect(extractOrderCode(undefined)).toBeNull()
  })
})

describe('contentMatchesTransfer() — underscore-stripping tolerance', () => {
  it('matches when the bank preserved the underscore', () => {
    expect(contentMatchesTransfer('NAP TIEN TCOIN_A1B2C3', 'TCOIN_A1B2C3')).toBe(true)
  })

  it('matches when the bank stripped the underscore (the core bug)', () => {
    // Stored "TCOIN_PDFYZ3SE", bank delivers "TCOINPDFYZ3SE ...".
    expect(
      contentMatchesTransfer('TCOINPDFYZ3SE   Ma giao dich  Trace090976', 'TCOIN_PDFYZ3SE'),
    ).toBe(true)
  })

  it('matches the free-amount format with internal underscores stripped', () => {
    expect(contentMatchesTransfer('TCOINABCDEFLX12NK extra', 'TCOIN_ABCDEF_LX12NK')).toBe(true)
  })

  it('does not match a different order code', () => {
    expect(contentMatchesTransfer('TCOINPDFYZ3SE', 'TCOIN_OTHER99')).toBe(false)
  })

  it('returns false on empty / missing content', () => {
    expect(contentMatchesTransfer('', 'TCOIN_A1B2C3')).toBe(false)
    expect(contentMatchesTransfer('TCOIN_A1B2C3', '')).toBe(false)
    expect(contentMatchesTransfer(null, null)).toBe(false)
  })
})

describe('normalizeBankContent()', () => {
  it('uppercases and strips everything but A-Z0-9', () => {
    expect(normalizeBankContent('tcoin_a1 b2-c3.')).toBe('TCOINA1B2C3')
    expect(normalizeBankContent(null)).toBe('')
  })
})

describe('SEPAY_LOG_TAGS', () => {
  it('exposes the documented tag set', () => {
    expect(SEPAY_LOG_TAGS).toMatchObject({
      RECEIVED: 'SEPAY_WEBHOOK_RECEIVED',
      NOT_FOUND: 'SEPAY_PAYMENT_NOT_FOUND',
      AMOUNT_BAD: 'SEPAY_AMOUNT_INVALID',
      PAID: 'SEPAY_PAYMENT_PAID',
      DUPLICATE: 'SEPAY_DUPLICATE_TRANSACTION',
      ERROR: 'SEPAY_WEBHOOK_ERROR',
    })
  })
})
