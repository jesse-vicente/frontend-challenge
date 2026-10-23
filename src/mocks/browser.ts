import { setupWorker } from 'msw/browser'
import { installControl } from './control'
import { initDb, resetDb } from './db/store'
import { restHandlers } from './handlers'
import { setSessionValidator } from './realtime/publisher'
import { createSocketHandler, setTokenResolver } from './realtime/server'
import { initScenario } from './scenarios/runtime'
import { resumePendingOrders } from './services/orders'
import { isTokenActiveFor, userIdForToken } from './services/sessions'

/** Query params read once at boot: `?scenario=<name>` and `?mock-reset`. */
const SCENARIO_PARAM = 'scenario'
const RESET_PARAM = 'mock-reset'

/**
 * Starts the simulated backend (REST via service worker, Socket.IO via
 * WebSocket interception). Must resolve before the app issues any request.
 */
export async function startMocks(): Promise<void> {
  const url = new URL(window.location.href)
  initScenario(url.searchParams.get(SCENARIO_PARAM))
  if (url.searchParams.has(RESET_PARAM)) await resetDb()
  else await initDb()

  setTokenResolver(userIdForToken)
  setSessionValidator(isTokenActiveFor)

  const worker = setupWorker(...restHandlers, createSocketHandler())
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })

  resumePendingOrders()
  installControl()

  // Keep the app URL clean: scenario params are not part of the router state.
  if (url.searchParams.has(SCENARIO_PARAM) || url.searchParams.has(RESET_PARAM)) {
    url.searchParams.delete(SCENARIO_PARAM)
    url.searchParams.delete(RESET_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }
}
