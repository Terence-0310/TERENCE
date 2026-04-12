// ============================================
// Unit Tests — Session Cookie Parser (pure function)
// ============================================
// Tests getSessionIdFromCookie — the only pure function in session.ts
// that can be tested without DB/cookie mocking.

import { describe, it, expect } from 'vitest'
import { AuthService } from '@/src/be/modules/auth'

describe('getSessionIdFromCookie()', () => {
  it('should return null for null header', () => {
    expect(AuthService.getSessionIdFromCookie(null)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(AuthService.getSessionIdFromCookie('')).toBeNull()
  })

  it('should extract session id from single cookie', () => {
    expect(AuthService.getSessionIdFromCookie('terence_session=abc123')).toBe('abc123')
  })

  it('should extract session id from multiple cookies', () => {
    const header = 'other=x; terence_session=session-xyz-456; theme=dark'
    expect(AuthService.getSessionIdFromCookie(header)).toBe('session-xyz-456')
  })

  it('should return null when session cookie not present', () => {
    expect(AuthService.getSessionIdFromCookie('theme=dark; lang=vi')).toBeNull()
  })

  it('should handle whitespace in cookie header', () => {
    expect(AuthService.getSessionIdFromCookie('  terence_session=abc;  other=x  ')).toBe('abc')
  })

  it('should handle UUID-style session ids', () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    expect(AuthService.getSessionIdFromCookie(`terence_session=${uuid}`)).toBe(uuid)
  })

  it('should handle cookies with = in value', () => {
    // Session ID shouldn't have =, but test for graceful handling
    expect(AuthService.getSessionIdFromCookie('terence_session=abc=def')).toBe('abc')
  })
})
