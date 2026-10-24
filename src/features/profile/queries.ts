import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { announce } from '@/shared/a11y/announcer'
import { apiCommand, apiRequest } from '@/shared/api/client'
import {
  type ChangePasswordRequest,
  type ProfileDto,
  profileSchema,
  type UpdateProfileRequest,
} from '@/shared/api/dtos/profile'
import { type CacheOwner, queryKeys } from '@/shared/api/query-keys'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { sessionStore } from '@/shared/session/session-store'

export const profileQuery = (owner: CacheOwner) =>
  queryOptions({
    queryKey: queryKeys.private.profile(owner),
    queryFn: ({ signal }) => apiRequest(profileSchema, { url: '/me', signal }),
    staleTime: 5 * 60_000,
  })

/** Keeps the session user (header, menus) in sync with the saved profile. */
function syncSession(profile: ProfileDto) {
  const user = sessionStore.getUser()
  if (!user) return
  sessionStore.updateUser({
    ...user,
    email: profile.email,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  })
}

function useProfileMutation<TInput>(request: (input: TInput) => Promise<ProfileDto>, message: string) {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  return useMutation({
    mutationFn: request,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.private.profile(owner), profile)
      syncSession(profile)
      announce(message)
    },
  })
}

export const useUpdateProfile = () =>
  useProfileMutation(
    (data: UpdateProfileRequest) => apiRequest(profileSchema, { method: 'PATCH', url: '/me', data }),
    'Perfil atualizado.',
  )

export const useUploadAvatar = () =>
  useProfileMutation((file: File) => {
    const data = new FormData()
    data.append('avatar', file)
    return apiRequest(profileSchema, { method: 'PUT', url: '/me/avatar', data })
  }, 'Avatar atualizado.')

export const useRemoveAvatar = () =>
  useProfileMutation(() => apiRequest(profileSchema, { method: 'DELETE', url: '/me/avatar' }), 'Avatar removido.')

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => apiCommand({ method: 'PUT', url: '/me/password', data }),
    onSuccess: () => announce('Senha alterada.'),
  })
}
