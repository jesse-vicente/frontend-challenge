import { type CacheOwner, guestOwner, userOwner } from '../api/query-keys'
import { type SessionState, sessionStore, useSession } from './session-store'

/** Owner of the private cache scope for a session state (user, guest cart, or none yet). */
export function cacheOwnerOf(state: SessionState): CacheOwner | null {
  if (state.session) return userOwner(state.session.user.id)
  const guestCartId = sessionStore.getGuestCartId()
  return guestCartId ? guestOwner(guestCartId) : null
}

export function currentCacheOwner(): CacheOwner | null {
  return cacheOwnerOf(sessionStore.getState())
}

export function useCacheOwner(): CacheOwner | null {
  return cacheOwnerOf(useSession())
}
