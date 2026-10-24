import { createMemoryHistory } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { setBackendReady } from '@/shared/api/backend-ready'
import { App, createApp, PRERENDERED_PATH } from './app'

/**
 * Build-time render of the home page in its loading state (vite.config.ts injects it into
 * index.html). Header, hero and skeletons paint from the HTML before any script runs; the
 * browser then hydrates this markup (src/main.tsx). No data is fetched here: requests wait
 * for a backend that never becomes ready, so every query stays pending, as on a cold start.
 */
export async function prerender(): Promise<string> {
  setBackendReady(new Promise(() => undefined))
  const { queryClient, router } = createApp(createMemoryHistory({ initialEntries: [PRERENDERED_PATH] }))
  // No garbage-collection timers: they would keep the build process alive.
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, gcTime: Number.POSITIVE_INFINITY },
  })
  await router.load()
  const markup = renderToString(
    <StrictMode>
      <App queryClient={queryClient} router={router} />
    </StrictMode>,
  )
  return markup
}
