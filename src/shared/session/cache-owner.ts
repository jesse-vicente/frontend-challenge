import { type CacheOwner, guestOwner, userOwner } from '../api/query-keys'
import { type SessionState, sessionStore, useSession } from './session-store'

/** Owner of the private cache scope for a session state: the user, or the guest cart. */
export function cacheOwnerOf(state: SessionState): CacheOwner {
  if (state.session) return userOwner(state.session.user.id)
  return guestOwner(sessionStore.ensureGuestCartId())
}

export function currentCacheOwner(): CacheOwner {
  return cacheOwnerOf(sessionStore.getState())
}

export function useCacheOwner(): CacheOwner {
  return cacheOwnerOf(useSession())
}
