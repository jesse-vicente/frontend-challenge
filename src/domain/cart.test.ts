import { describe, expect, it } from 'vitest'
import { lineKey, lineSubtotal, mergeLines, subtractPurchased, validateLine } from './cart'

const stock = { available: 5, maxPerOrder: 3 }

describe('cart rules', () => {
  it('builds line keys per nft and edition', () => {
    expect(lineKey({ nftId: 'n1', editionId: 'e1' })).toBe('n1:e1')
  })

  it('computes line subtotal with decimal precision', () => {
    expect(lineSubtotal('0.1', 3)).toBe('0.3')
  })

  it('validates lines against stock', () => {
    expect(validateLine({ quantity: 2 }, stock)).toBeNull()
    expect(validateLine({ quantity: 0 }, stock)).toEqual({ kind: 'invalid-quantity' })
    expect(validateLine({ quantity: 4 }, stock)).toEqual({ kind: 'quantity-reduced', requested: 4, allowed: 3 })
    expect(validateLine({ quantity: 1 }, { available: 0, maxPerOrder: 3 })).toEqual({ kind: 'sold-out' })
  })

  it('merges guest lines, summing and clamping quantities', () => {
    const user = [{ nftId: 'a', editionId: '1', quantity: 2 }]
    const guest = [
      { nftId: 'a', editionId: '1', quantity: 2 },
      { nftId: 'b', editionId: '1', quantity: 1 },
      { nftId: 'gone', editionId: '1', quantity: 1 },
    ]
    const merged = mergeLines(user, guest, (line) => (line.nftId === 'gone' ? undefined : stock))
    expect(merged).toEqual([
      { nftId: 'a', editionId: '1', quantity: 3 },
      { nftId: 'b', editionId: '1', quantity: 1 },
    ])
  })

  it('drops sold-out editions on merge', () => {
    const merged = mergeLines([], [{ nftId: 'a', editionId: '1', quantity: 1 }], () => ({
      available: 0,
      maxPerOrder: 3,
    }))
    expect(merged).toEqual([])
  })

  it('subtracts only purchased quantities', () => {
    const cart = [
      { id: 'l1', nftId: 'a', editionId: '1', quantity: 3 },
      { id: 'l2', nftId: 'b', editionId: '1', quantity: 1 },
    ]
    const remaining = subtractPurchased(cart, [
      { nftId: 'a', editionId: '1', quantity: 2 },
      { nftId: 'b', editionId: '1', quantity: 1 },
    ])
    expect(remaining).toEqual([{ id: 'l1', nftId: 'a', editionId: '1', quantity: 1 }])
  })
})
