import { describe, expect, it } from 'vitest'
import { createEventGuard, resourceKey } from './events'

const nft = { type: 'nft', id: 'n1' }

describe('event guard', () => {
  it('builds resource keys', () => {
    expect(resourceKey(nft)).toBe('nft:n1')
  })

  it('applies newer events and rejects duplicates', () => {
    const guard = createEventGuard()
    expect(guard.inspect({ eventId: 'a', resource: nft, version: 1 })).toBe('apply')
    expect(guard.inspect({ eventId: 'a', resource: nft, version: 1 })).toBe('duplicate')
    expect(guard.inspect({ eventId: 'b', resource: nft, version: 2 })).toBe('apply')
    expect(guard.versionOf(nft)).toBe(2)
  })

  it('rejects events older than the latest known version', () => {
    const guard = createEventGuard()
    guard.inspect({ eventId: 'b', resource: nft, version: 5 })
    expect(guard.inspect({ eventId: 'a', resource: nft, version: 4 })).toBe('stale')
    expect(guard.inspect({ eventId: 'c', resource: nft, version: 5 })).toBe('stale')
  })

  it('uses versions observed via REST as the baseline', () => {
    const guard = createEventGuard()
    guard.observe(nft, 7)
    guard.observe(nft, 3)
    expect(guard.versionOf(nft)).toBe(7)
    expect(guard.inspect({ eventId: 'x', resource: nft, version: 6 })).toBe('stale')
    expect(guard.inspect({ eventId: 'y', resource: nft, version: 8 })).toBe('apply')
  })

  it('tracks versions per resource', () => {
    const guard = createEventGuard()
    guard.inspect({ eventId: 'a', resource: nft, version: 5 })
    expect(guard.inspect({ eventId: 'b', resource: { type: 'nft', id: 'n2' }, version: 1 })).toBe('apply')
  })

  it('forgets the oldest ids beyond capacity and resets', () => {
    const guard = createEventGuard({ maxRememberedIds: 2 })
    guard.inspect({ eventId: 'a', resource: { type: 'nft', id: '1' }, version: 1 })
    guard.inspect({ eventId: 'b', resource: { type: 'nft', id: '2' }, version: 1 })
    guard.inspect({ eventId: 'c', resource: { type: 'nft', id: '3' }, version: 1 })
    // "a" was evicted from the id cache, but its version still protects the resource.
    expect(guard.inspect({ eventId: 'a', resource: { type: 'nft', id: '1' }, version: 1 })).toBe('stale')
    guard.reset()
    expect(guard.versionOf(nft)).toBeUndefined()
  })
})
