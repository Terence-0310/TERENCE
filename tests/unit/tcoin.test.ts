import { describe, it, expect } from 'vitest'
import { calculateTCoinBonus } from '@/src/be/modules/tcoin/tcoin.service'

describe('TCoin Wallet Logic - calculateTCoinBonus', () => {
  it('should return 0 bonus for amounts under 100', () => {
    const result = calculateTCoinBonus(50)
    expect(result).toEqual({
      base: 50,
      bonusPercentage: 0,
      bonus: 0,
      total: 50
    })
  })

  it('should apply 5% bonus for amounts >= 100', () => {
    const result = calculateTCoinBonus(100)
    expect(result).toEqual({
      base: 100,
      bonusPercentage: 5,
      bonus: 5,
      total: 105
    })
  })

  it('should apply 10% bonus for amounts >= 500', () => {
    const result = calculateTCoinBonus(500)
    expect(result).toEqual({
      base: 500,
      bonusPercentage: 10,
      bonus: 50,
      total: 550
    })
  })

  it('should apply 15% bonus for amounts >= 1200', () => {
    const result = calculateTCoinBonus(1200)
    expect(result).toEqual({
      base: 1200,
      bonusPercentage: 15,
      bonus: 180,
      total: 1380
    })
  })

  it('should apply 20% bonus for amounts >= 3000', () => {
    const result = calculateTCoinBonus(3000)
    expect(result).toEqual({
      base: 3000,
      bonusPercentage: 20,
      bonus: 600,
      total: 3600
    })
  })

  it('should apply event multiplier correctly (e.g. 1.5x)', () => {
    // 500 * 1.5 = 750
    // Bonus for 500 is 10%. So 750 * 10% = 75
    // Total = 750 + 75 = 825
    const result = calculateTCoinBonus(500, 1.5)
    expect(result).toEqual({
      base: 750,
      bonusPercentage: 10,
      bonus: 75,
      total: 825
    })
  })

  it('should floor the results correctly for decimal multiplications', () => {
    // 100 * 1.12 = 112
    // Bonus for 100 is 5%. 112 * 0.05 = 5.6 -> floored to 5
    // Total = 112 + 5 = 117
    const result = calculateTCoinBonus(100, 1.12)
    expect(result).toEqual({
      base: 112,
      bonusPercentage: 5,
      bonus: 5,
      total: 117
    })
  })
})
