import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RouterHistory, RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { trackCurrentPage } from '@/features/auth/auth-modal'
import { startRealtime } from '@/shared/realtime/realtime-client'
import { sessionStore } from '@/shared/session/session-store'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

export type AppRouter = ReturnType<typeof createAppRouter>

/** Page prerendered into index.html (signed out, no search). */
export const PRERENDERED_PATH = '/'

/** Whether the browser's first render matches the prerendered markup. */
export function matchesPrerender(): boolean {
  return window.location.pathname === PRERENDERED_PATH && !window.location.search && !sessionStore.getState().session
}

/** Query client and router, created before the first render (also used by the prerender). */
export function createApp(history?: RouterHistory): { queryClient: QueryClient; router: AppRouter } {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient, history)
  // Route guards need the page the visitor is leaving (sign-in modal over it).
  router.subscribe('onResolved', ({ toLocation }) => trackCurrentPage(toLocation.href))
  return { queryClient, router }
}

export function App({ queryClient, router }: { queryClient: QueryClient; router: AppRouter }) {
  useEffect(() => startRealtime(queryClient), [queryClient])

  // Session ended (expired or logged out): re-run guards so private routes redirect.
  useEffect(
    () =>
      sessionStore.subscribe((next, previous) => {
        if (previous.session && !next.session) void router.invalidate()
      }),
    [router],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
