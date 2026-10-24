import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { cacheOwnerOf } from '@/shared/session/cache-owner'
import { sessionStore } from '@/shared/session/session-store'

const MAX_QUERY_RETRIES = 2

/**
 * Cache policy (documented in ARCHITECTURE.md):
 * - public catalog data is fresh for 30 s; private data per feature overrides it;
 * - only transient failures (network, timeout, 5xx) are retried, with backoff;
 * - mutations are never retried automatically (orders retry manually with the
 *   same idempotency key).
 */
export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => failureCount < MAX_QUERY_RETRIES && isApiError(error) && error.isTransient,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
      mutations: { retry: false },
    },
  })

  // Logout or user switch: drop every private query of the previous owner.
  sessionStore.subscribe((next, previous) => {
    if (next.session?.user.id === previous.session?.user.id) return
    const previousOwner = cacheOwnerOf(previous)
    if (previousOwner) queryClient.removeQueries({ queryKey: queryKeys.private.all(previousOwner) })
    queryClient.removeQueries({ queryKey: queryKeys.session() })
  })

  return queryClient
}
