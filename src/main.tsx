import '@/styles/globals.css'
import { StrictMode, startTransition, useEffect } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { holdBackendUntil, setBackendReady } from '@/shared/api/backend-ready'

/** Longest wait for the route data before the first render. */
const FIRST_RENDER_WAIT_MS = 1000

interface FirstRouteRouter {
  load: () => Promise<unknown>
  history: { subscribe: (listener: () => void) => () => void }
}

/** Loads the opened route before the first render; navigating meanwhile loads the new location. */
function loadFirstRoute(router: FirstRouteRouter, maxWaitMs?: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer)
      unsubscribe()
      resolve()
    }
    const timer = maxWaitMs === undefined ? undefined : window.setTimeout(done, maxWaitMs)
    const unsubscribe = router.history.subscribe(() => {
      void router.load()
      done()
    })
    void router.load().finally(done)
  })
}

/** Calls `onDone` once the tree it closes has committed (after hydration). */
function Committed({ onDone }: { onDone: () => void }) {
  useEffect(onDone, [onDone])
  return null
}

async function bootstrap() {
  // Mocks start in parallel; requests and the socket wait for backendReady.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { takeMockBootParams } = await import('@/mocks/boot-params')
    const params = takeMockBootParams()
    setBackendReady(import('@/mocks/browser').then(({ startMocks }) => startMocks(params)))
  }

  const [{ App, createApp, matchesPrerender }, { installAuthBridge }] = await Promise.all([
    import('@/app/app'),
    import('@/app/auth-bridge'),
  ])

  // Before the first render: route loaders may request private data immediately.
  installAuthBridge()

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element #root not found')

  const { queryClient, router } = createApp()
  const app = (
    <StrictMode>
      <App queryClient={queryClient} router={router} />
    </StrictMode>
  )

  // index.html holds the prerendered home page: hydrate it when it matches, otherwise replace it.
  // Either class means index.html already hid part of it (boot params count as search there).
  const html = document.documentElement
  const prerenderShown = !html.classList.contains('skip-prerender') && !html.classList.contains('prerender-shell')
  if (rootElement.hasChildNodes() && prerenderShown && matchesPrerender()) {
    // The markup has every query pending: requests start once it is hydrated.
    let hydrated = () => {}
    holdBackendUntil(new Promise<void>((resolve) => (hydrated = resolve)))
    await loadFirstRoute(router)
    if (matchesPrerender()) {
      // As the router's SSR hydration does: no client-only Suspense around the root.
      router.ssr = { manifest: undefined }
      hydrateRoot(
        rootElement,
        <StrictMode>
          <App queryClient={queryClient} router={router} />
          <Committed onDone={hydrated} />
        </StrictMode>,
      )
      return
    }
    hydrated()
  } else {
    // Render once with the data when it is quick; slower loads show the route skeleton.
    await loadFirstRoute(router, FIRST_RENDER_WAIT_MS)
  }
  html.classList.remove('skip-prerender', 'prerender-shell')
  rootElement.replaceChildren()
  const root = createRoot(rootElement)
  // Time-sliced first render.
  startTransition(() => root.render(app))
}

void bootstrap()
