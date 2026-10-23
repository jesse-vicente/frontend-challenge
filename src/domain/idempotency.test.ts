import { describe, expect, it } from 'vitest'
import { payloadFingerprint, stableStringify } from './idempotency'

describe('idempotency fingerprint', () => {
  it('serializes independently of key order and skips undefined', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 'x' }], e: undefined })).toBe('{"a":[{"c":"x","d":2}],"b":1}')
  })

  it('produces equal fingerprints for equal payloads', () => {
    const a = payloadFingerprint({ quoteId: 'q1', items: [{ nftId: 'n1', quantity: 2 }] })
    const b = payloadFingerprint({ items: [{ quantity: 2, nftId: 'n1' }], quoteId: 'q1' })
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{14}$/)
  })

  it('produces different fingerprints for different payloads', () => {
    expect(payloadFingerprint({ quantity: 1 })).not.toBe(payloadFingerprint({ quantity: 2 }))
  })
})
