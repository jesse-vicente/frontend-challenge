import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { announce } from '@/shared/a11y/announcer'
import { apiRequest } from '@/shared/api/client'
import { type FavoritesDto, favoritesSchema } from '@/shared/api/dtos/favorites'
import { type CacheOwner, queryKeys } from '@/shared/api/query-keys'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'

export const favoritesQuery = (owner: CacheOwner) =>
  queryOptions({
    queryKey: queryKeys.private.favorites(owner),
    queryFn: ({ signal }) => apiRequest(favoritesSchema, { url: '/me/favorites', signal }),
  })

/** Favorites belong to authenticated users only; guests get an empty, disabled set. */
export function useFavorites() {
  const user = useSessionUser()
  const owner = useCacheOwner()
  const query = useQuery({ ...favoritesQuery(owner), enabled: Boolean(user) })
  return { ...query, ids: new Set(query.data?.nftIds ?? []), enabled: Boolean(user) }
}

/**
 * Optimistic toggle: the heart flips immediately, rolls back on failure and is
 * reconciled with the server list afterwards.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  const key = queryKeys.private.favorites(owner)

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      apiRequest(favoritesSchema, {
        method: favorite ? 'PUT' : 'DELETE',
        url: `/me/favorites/${encodeURIComponent(nftId)}`,
      }),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesDto>(key)
      const current = previous?.nftIds ?? []
      queryClient.setQueryData<FavoritesDto>(key, {
        nftIds: favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      })
      return { previous }
    },
    onError: (_error, { name }, context) => {
      // Clicked before the list loaded: there is nothing to restore (setQueryData ignores
      // undefined), so drop the optimistic value and fetch the server list again.
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      else void queryClient.resetQueries({ queryKey: key })
      toast.error(`Não foi possível atualizar os favoritos de ${name}. Tente novamente.`)
      announce('Falha ao atualizar favoritos. A alteração foi desfeita.', 'assertive')
    },
    onSuccess: (favorites, { favorite, name }) => {
      queryClient.setQueryData(key, favorites)
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
  })
}
