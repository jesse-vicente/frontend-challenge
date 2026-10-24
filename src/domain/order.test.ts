import { describe, expect, it } from 'vitest'
import { canTransition, isTerminal, reconcileOrderState, type VersionedOrderState } from './order'

describe('order state machine', () => {
  it('only allows pending to move to a terminal state', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('pending', 'declined')).toBe(true)
    expect(canTransition('confirmed', 'declined')).toBe(false)
    expect(canTransition('declined', 'pending')).toBe(false)
    expect(isTerminal('pending')).toBe(false)
    expect(isTerminal('confirmed')).toBe(true)
  })

  it('accepts newer versions with valid transitions', () => {
    const pending: VersionedOrderState = { status: 'pending', version: 1 }
    const confirmed: VersionedOrderState = { status: 'confirmed', version: 2 }
    expect(reconcileOrderState(undefined, pending)).toBe(pending)
    expect(reconcileOrderState(pending, confirmed)).toBe(confirmed)
  })

  it('ignores stale or duplicate versions', () => {
    const confirmed: VersionedOrderState = { status: 'confirmed', version: 2 }
    expect(reconcileOrderState(confirmed, { status: 'pending', version: 1 })).toBe(confirmed)
    expect(reconcileOrderState(confirmed, { status: 'confirmed', version: 2 })).toBe(confirmed)
  })

  it('never leaves a terminal state, even with a higher version', () => {
    const declined: VersionedOrderState = { status: 'declined', version: 3 }
    expect(reconcileOrderState(declined, { status: 'confirmed', version: 4 })).toBe(declined)
  })
})
