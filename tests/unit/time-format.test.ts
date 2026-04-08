// ============================================
// Unit Tests — Time Format Utilities
// ============================================

import { describe, it, expect } from 'vitest'
import { formatTime, formatDurationVi } from '@/lib/player/time-format'

describe('formatTime()', () => {
  it('should format seconds to M:SS', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(125)).toBe('2:05')
  })

  it('should format hours to H:MM:SS', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
    expect(formatTime(7265)).toBe('2:01:05')
  })

  it('should handle edge cases', () => {
    expect(formatTime(-1)).toBe('0:00')
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
    expect(formatTime(-Infinity)).toBe('0:00')
  })

  it('should floor fractional seconds', () => {
    expect(formatTime(65.7)).toBe('1:05')
    expect(formatTime(3661.9)).toBe('1:01:01')
  })
})

describe('formatDurationVi()', () => {
  it('should format hours and minutes in Vietnamese', () => {
    expect(formatDurationVi(5400)).toBe('1 giờ 30 phút')
    expect(formatDurationVi(7200)).toBe('2 giờ')
    expect(formatDurationVi(1800)).toBe('30 phút')
  })

  it('should return empty for zero/negative', () => {
    expect(formatDurationVi(0)).toBe('')
    expect(formatDurationVi(-100)).toBe('')
  })

  it('should handle NaN/Infinity', () => {
    expect(formatDurationVi(NaN)).toBe('')
    expect(formatDurationVi(Infinity)).toBe('')
  })

  it('should handle exact hours', () => {
    expect(formatDurationVi(3600)).toBe('1 giờ')
    expect(formatDurationVi(10800)).toBe('3 giờ')
  })
})
