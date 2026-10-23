import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { type Session, type SessionUser, sessionSchema } from '../api/dtos/auth'
import { readStored, removeStored, writeStored } from '../lib/storage'

const SESSION_KEY = 'nft:session'
const GUEST_CART_KEY = 'nft:guest-cart'

export type SessionEndReason = 'logout' | 'expired' | 'unauthenticated'

export interface SessionState {
  session: Session | null
  /** Why the last session ended; drives the "session expired" notice on the login page. */
  endReason: SessionEndReason | null
}

type Listener = (state: SessionState, previous: SessionState) => void

const listeners = new Set<Listener>()
let state: SessionState = {
  session: readStored('local', SESSION_KEY, sessionSchema),
  endReason: null,
}

function setState(next: SessionState): void {
  const previous = state
  state = next
  for (const listener of listeners) listener(state, previous)
}

/**
 * Single owner of the authenticated session. The token is the only secret kept
 * on the client (in localStorage, see ARCHITECTURE.md); passwords never are.
 */
export const sessionStore = {
  getState: () => state,
  getToken: () => state.session?.token ?? null,
  getUser: (): SessionUser | null => state.session?.user ?? null,

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  signIn(session: Session): void {
    writeStored('local', SESSION_KEY, session)
    // The guest cart was merged into the account by the API.
    removeStored('local', GUEST_CART_KEY)
    setState({ session, endReason: null })
  },

  updateUser(user: SessionUser): void {
    if (!state.session) return
    const session = { ...state.session, user }
    writeStored('local', SESSION_KEY, session)
    setState({ ...state, session })
  },

  end(reason: SessionEndReason): void {
    if (!state.session && state.endReason === reason) return
    removeStored('local', SESSION_KEY)
    setState({ session: null, endReason: reason })
  },

  clearEndReason(): void {
    if (state.endReason) setState({ ...state, endReason: null })
  },

  getGuestCartId: () => readStored('local', GUEST_CART_KEY, z.string()),
  /** Guests get a client-generated cart id; the API creates the cart on first use. */
  ensureGuestCartId(): string {
    const existing = readStored('local', GUEST_CART_KEY, z.string())
    if (existing) return existing
    const created = crypto.randomUUID()
    writeStored('local', GUEST_CART_KEY, created)
    return created
  },
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState, sessionStore.getState)
}

export function useSessionUser(): SessionUser | null {
  return useSession().session?.user ?? null
}
