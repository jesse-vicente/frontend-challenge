import { describe, expect, it } from 'vitest'
import { type Coupon, computeQuote, diffQuotes, evaluateCoupon, isQuoteExpired, normalizeCouponCode } from './quote'

const now = new Date('2026-01-01T12:00:00Z')

const percent10: Coupon = { code: 'WELCOME10', kind: 'percent', value: '10', expiresAt: '2027-01-01T00:00:00Z' }
const expired: Coupon = { code: 'OLD', kind: 'percent', value: '50', expiresAt: '2025-01-01T00:00:00Z' }
const fixedBig: Coupon = { code: 'BIG', kind: 'fixed', value: '100', expiresAt: '2027-01-01T00:00:00Z' }

const line = (overrides = {}) => ({
  nftId: 'n1',
  editionId: 'e1',
  quantity: 2,
  unitPrice: '1.5',
  available: 10,
  maxPerOrder: 5,
  ...overrides,
})

describe('coupons', () => {
  it('normalizes codes', () => {
    expect(normalizeCouponCode('  welcome10 ')).toBe('WELCOME10')
  })

  it('evaluates percent, fixed, expired and missing coupons', () => {
    expect(evaluateCoupon(percent10, '3', now)).toEqual({ ok: true, discount: '0.3' })
    expect(evaluateCoupon(fixedBig, '3', now)).toEqual({ ok: true, discount: '3' })
    expect(evaluateCoupon(expired, '3', now)).toEqual({ ok: false, reason: 'expired' })
    expect(evaluateCoupon(undefined, '3', now)).toEqual({ ok: false, reason: 'not-found' })
    expect(evaluateCoupon({ ...percent10, minSubtotal: '5' }, '3', now)).toEqual({ ok: false, reason: 'min-subtotal' })
  })
})

describe('computeQuote', () => {
  it('computes subtotal, discount, fee and total', () => {
    const quote = computeQuote({
      lines: [line(), line({ nftId: 'n2', unitPrice: '0.25', quantity: 1 })],
      networkFee: '0.01',
      couponCode: 'welcome10',
      coupon: percent10,
      now,
    })
    expect(quote.subtotal).toBe('3.25')
    expect(quote.discount).toBe('0.325')
    expect(quote.networkFee).toBe('0.01')
    expect(quote.total).toBe('2.935')
    expect(quote.appliedCoupon).toBe('WELCOME10')
    expect(quote.purchasable).toBe(true)
  })

  it('reports coupon rejection without discount', () => {
    const quote = computeQuote({ lines: [line()], networkFee: '0', couponCode: 'old', coupon: expired, now })
    expect(quote.discount).toBe('0')
    expect(quote.couponRejection).toBe('expired')
  })

  it('clamps to stock and flags lines that cannot be bought as requested', () => {
    const quote = computeQuote({
      lines: [line({ quantity: 4, available: 3 }), line({ nftId: 'n2', available: 0 })],
      networkFee: '0.01',
      now,
    })
    expect(quote.lines[0]?.effectiveQuantity).toBe(3)
    expect(quote.lines[0]?.issue).toEqual({ kind: 'quantity-reduced', requested: 4, allowed: 3 })
    expect(quote.lines[1]?.issue).toEqual({ kind: 'sold-out' })
    expect(quote.subtotal).toBe('4.5')
    expect(quote.purchasable).toBe(false)
  })

  it('charges no network fee for an empty cart', () => {
    const quote = computeQuote({ lines: [], networkFee: '0.01', now })
    expect(quote.total).toBe('0')
    expect(quote.purchasable).toBe(false)
  })
})

describe('diffQuotes', () => {
  const snapshot = (overrides = {}) => ({
    lines: [{ nftId: 'n1', editionId: 'e1', unitPrice: '1', effectiveQuantity: 2, issue: null }],
    discount: '0',
    networkFee: '0.01',
    total: '2.01',
    expiresAt: '2026-01-01T12:05:00Z',
    ...overrides,
  })

  it('returns no changes for identical quotes', () => {
    expect(diffQuotes(snapshot(), snapshot())).toEqual([])
  })

  it('detects price, availability and total changes', () => {
    const fresh = snapshot({
      lines: [{ nftId: 'n1', editionId: 'e1', unitPrice: '1.2', effectiveQuantity: 1, issue: null }],
      total: '1.21',
    })
    expect(diffQuotes(snapshot(), fresh)).toEqual([
      { kind: 'price', key: 'n1:e1', from: '1', to: '1.2' },
      { kind: 'availability', key: 'n1:e1', from: 2, to: 1 },
      { kind: 'total', from: '2.01', to: '1.21' },
    ])
  })

  it('detects removed and added lines', () => {
    const fresh = snapshot({
      lines: [{ nftId: 'n2', editionId: 'e1', unitPrice: '1', effectiveQuantity: 2, issue: null }],
    })
    expect(diffQuotes(snapshot(), fresh)).toEqual([
      { kind: 'line-removed', key: 'n1:e1' },
      { kind: 'line-added', key: 'n2:e1' },
    ])
  })

  it('checks expiry', () => {
    expect(isQuoteExpired(snapshot(), now)).toBe(false)
    expect(isQuoteExpired(snapshot(), new Date('2026-01-01T12:05:00Z'))).toBe(true)
  })
})
