import { type QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `history` defaults to the browser history; the build-time prerender passes a memory one. */
export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: 'intent',
    // Loaders read through the Query cache, which owns freshness.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Anchor links (#market, #favorites) glide to their section.
    defaultHashScrollIntoView: { behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' },
    defaultStructuralSharing: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
