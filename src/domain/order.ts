export type OrderStatus = 'pending' | 'confirmed' | 'declined'

const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ['confirmed', 'declined'],
  confirmed: [],
  declined: [],
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export interface VersionedOrderState {
  readonly status: OrderStatus
  readonly version: number
}

/**
 * Picks the state to keep when an update arrives (REST refetch or realtime event).
 * Older versions are ignored and terminal states never regress.
 */
export function reconcileOrderState<T extends VersionedOrderState>(current: T | undefined, incoming: T): T {
  if (!current) return incoming
  if (incoming.version <= current.version) return current
  if (incoming.status === current.status) return incoming
  return canTransition(current.status, incoming.status) ? incoming : current
}
