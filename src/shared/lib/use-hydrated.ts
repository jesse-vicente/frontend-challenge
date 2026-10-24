import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False while React hydrates prerendered markup (it reads the server snapshot), true afterwards
 * and on every client-only render. A route's content sits in a Suspense boundary that hydrates
 * after the root commits, when its data may already be cached: rendering that data there would
 * not match the prerendered loading state, and React would discard the markup.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
