import { setupWorker } from 'msw/browser'
import { type MockBootParams } from './boot-params'
import { installControl } from './control'
import { initDb, resetDb } from './db/store'
import { restHandlers } from './handlers'
import { setSessionValidator } from './realtime/publisher'
import { createSocketHandler, setTokenResolver } from './realtime/server'
import { initScenario } from './scenarios/runtime'
import { resumePendingOrders } from './services/orders'
import { isTokenActiveFor, userIdForToken } from './services/sessions'
import { createWorkerKeeper } from './worker-keeper'

/**
 * Starts the simulated backend (REST via service worker, Socket.IO via
 * WebSocket interception). Must resolve before the app issues any request; the
 * returned check keeps the worker serving this page after the tab was idle.
 */
export async function startMocks(params: MockBootParams): Promise<() => Promise<void>> {
  initScenario(params.scenario)
  if (params.reset) await resetDb()
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
  return createWorkerKeeper()
}
