/** A worker confirmed this recently cannot have been stopped for idleness (~30 s in Chrome). */
const CONFIRMED_FOR_MS = 10_000
const ACTIVATION_TIMEOUT_MS = 2_000

/**
 * Browsers stop an idle service worker. In a hidden tab timers are throttled, MSW's 5 s
 * keepalive stops reaching the worker, and the restarted worker no longer knows this page:
 * it lets every request through to the network (404 from the static host) until a reload.
 * Runs before each request and registers the page again when the worker may have stopped.
 */
export function createWorkerKeeper(): () => Promise<void> {
  let confirmedAt = Date.now()
  let pending: Promise<void> | null = null

  return () => {
    if (Date.now() - confirmedAt < CONFIRMED_FOR_MS) return Promise.resolve()
    pending ??= activateClient()
      .then(() => {
        confirmedAt = Date.now()
      })
      .finally(() => {
        pending = null
      })
    return pending
  }
}

function activateClient(): Promise<void> {
  const container = navigator.serviceWorker
  const controller = container?.controller
  if (!controller) return Promise.resolve()

  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer)
      container.removeEventListener('message', onMessage)
      resolve()
    }
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type === 'MOCKING_ENABLED') done()
    }
    const timer = window.setTimeout(done, ACTIVATION_TIMEOUT_MS)
    container.addEventListener('message', onMessage)
    // The message MSW sends on start: the worker adds this page to its active clients again.
    controller.postMessage('MOCK_ACTIVATE')
  })
}
