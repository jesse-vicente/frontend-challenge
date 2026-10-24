import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { trackCurrentPage } from '@/features/auth/auth-modal'
import { startRealtime } from '@/shared/realtime/realtime-client'
import { sessionStore } from '@/shared/session/session-store'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => {
    const created = createAppRouter(queryClient)
    // Route guards need the page the visitor is leaving (sign-in modal over it).
    created.subscribe('onResolved', ({ toLocation }) => trackCurrentPage(toLocation.href))
    return created
  })

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
