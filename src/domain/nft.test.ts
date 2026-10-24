import { describe, expect, it } from 'vitest'
import { availabilityOf, clampQuantity, isPurchasable, maxLineQuantity, remainingPurchasable } from './nft'

describe('nft availability', () => {
  it('classifies availability', () => {
    expect(availabilityOf({ available: 0 })).toBe('sold-out')
    expect(availabilityOf({ available: 2 })).toBe('low-stock')
    expect(availabilityOf({ available: 10 })).toBe('available')
    expect(isPurchasable({ available: 0 })).toBe(false)
  })

  it('caps by stock, per-order limit and cart content', () => {
    expect(remainingPurchasable({ available: 10, maxPerOrder: 4 })).toBe(4)
    expect(remainingPurchasable({ available: 2, maxPerOrder: 4 })).toBe(2)
    expect(remainingPurchasable({ available: 10, maxPerOrder: 4 }, 3)).toBe(1)
    expect(remainingPurchasable({ available: 10, maxPerOrder: 4 }, 6)).toBe(0)
    expect(maxLineQuantity({ available: -1, maxPerOrder: 4 })).toBe(0)
  })

  it('clamps requested quantity to valid integers', () => {
    expect(clampQuantity(0, 5)).toBe(1)
    expect(clampQuantity(9, 5)).toBe(5)
    expect(clampQuantity(2.7, 5)).toBe(2)
    expect(clampQuantity(Number.NaN, 5)).toBe(1)
    expect(clampQuantity(3, 0)).toBe(0)
  })
})
