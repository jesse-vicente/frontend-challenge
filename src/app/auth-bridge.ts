import { registerAuthBridge } from '@/shared/api/client'
import { sessionStore } from '@/shared/session/session-store'

/** Connects the HTTP layer to the session store (token, guest cart, expiry). */
export function installAuthBridge(): () => void {
  return registerAuthBridge({
    getAccessToken: sessionStore.getToken,
    // Guests are identified by their cart; authenticated users never send it.
    getGuestCartId: () => (sessionStore.getToken() ? null : sessionStore.ensureGuestCartId()),
    onSessionInvalid: (reason) => sessionStore.end(reason === 'SESSION_EXPIRED' ? 'expired' : 'unauthenticated'),
  })
}
