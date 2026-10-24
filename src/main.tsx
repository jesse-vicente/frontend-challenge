import '@/styles/globals.css'
import { StrictMode, startTransition } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { setBackendReady } from '@/shared/api/backend-ready'

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
  const html = document.documentElement
  if (rootElement.hasChildNodes() && !html.classList.contains('skip-prerender') && matchesPrerender()) {
    await loadFirstRoute(router)
    if (matchesPrerender()) {
      // As the router's SSR hydration does: no client-only Suspense around the root.
      router.ssr = { manifest: undefined }
      hydrateRoot(rootElement, app)
      return
    }
  } else {
    // Render once with the data when it is quick; slower loads show the route skeleton.
    await loadFirstRoute(router, FIRST_RENDER_WAIT_MS)
  }
  html.classList.remove('skip-prerender')
  rootElement.replaceChildren()
  const root = createRoot(rootElement)
  // Time-sliced first render.
  startTransition(() => root.render(app))
}

void bootstrap()
