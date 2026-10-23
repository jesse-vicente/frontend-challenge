import { useSyncExternalStore } from 'react'

export type Politeness = 'polite' | 'assertive'

interface Announcement {
  id: number
  message: string
  politeness: Politeness
}

let current: Announcement | null = null
let seq = 0
const listeners = new Set<() => void>()

/**
 * Sends a message to screen readers through the global live region.
 * Used for mutation feedback and realtime changes.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  seq += 1
  current = { id: seq, message, politeness }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAnnouncement(): Announcement | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
