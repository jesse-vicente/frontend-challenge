import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiCommand, apiRequest } from '@/shared/api/client'
import { type LoginRequest, type RegisterRequest, type Session, sessionSchema } from '@/shared/api/dtos/auth'
import { queryKeys } from '@/shared/api/query-keys'
import { sessionStore, useSession } from '@/shared/session/session-store'

/** Restores the stored session after a refresh; an invalid token ends it via the auth bridge. */
export const sessionQuery = () =>
  queryOptions({
    queryKey: queryKeys.session(),
    queryFn: async ({ signal }) => {
      const session = await apiRequest(sessionSchema, { url: '/auth/session', signal })
      sessionStore.updateUser(session.user)
      return session
    },
    staleTime: 5 * 60_000,
    retry: false,
  })

function useSignIn<TInput>(request: (input: TInput) => Promise<Session>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (session) => {
      sessionStore.signIn(session)
      queryClient.setQueryData(queryKeys.session(), session)
    },
  })
}

export function useLogin() {
  return useSignIn((input: Omit<LoginRequest, 'guestCartId'>) =>
    apiRequest(sessionSchema, {
      method: 'POST',
      url: '/auth/login',
      data: { ...input, guestCartId: sessionStore.getGuestCartId() ?? undefined },
    }),
  )
}

export function useRegister() {
  return useSignIn((input: Omit<RegisterRequest, 'guestCartId'>) =>
    apiRequest(sessionSchema, {
      method: 'POST',
      url: '/auth/register',
      data: { ...input, guestCartId: sessionStore.getGuestCartId() ?? undefined },
    }),
  )
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiCommand({ method: 'POST', url: '/auth/logout' }),
    // The local session ends even if the API is unreachable.
    onSettled: () => sessionStore.end('logout'),
  })
}

/** Validates the persisted session on boot; an expired token ends it through the auth bridge. */
export function useSessionRestore() {
  const token = useSession().session?.token
  useQuery({ ...sessionQuery(), enabled: Boolean(token) })
}
