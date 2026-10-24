import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { announce } from '@/shared/a11y/announcer'
import { apiRequest } from '@/shared/api/client'
import { type AddCartItemRequest, type CartDto, cartSchema } from '@/shared/api/dtos/cart'
import { type Network } from '@/shared/api/dtos/network'
import { quoteSchema } from '@/shared/api/dtos/quote'
import { type CacheOwner, queryKeys } from '@/shared/api/query-keys'
import { useCacheOwner } from '@/shared/session/cache-owner'

/** Cart mutations run one at a time, so rapid clicks never apply out of order. */
const CART_MUTATION_SCOPE = { id: 'cart' }

/** Network used to estimate fees before the collector picks one at checkout. */
export const ESTIMATE_NETWORK = 'ethereum' as const

export const cartQuery = (owner: CacheOwner) =>
  queryOptions({
    queryKey: queryKeys.private.cart(owner),
    queryFn: ({ signal }) => apiRequest(cartSchema, { url: '/cart', signal }),
    // Live prices come from the socket; refetch on focus covers missed events.
    staleTime: 0,
  })

export const quoteQuery = (owner: CacheOwner, network: Network) =>
  queryOptions({
    queryKey: queryKeys.private.quote(owner, network),
    queryFn: ({ signal }) => apiRequest(quoteSchema, { method: 'POST', url: '/quote', data: { network }, signal }),
    staleTime: 0,
  })

export function cartItemCount(cart: CartDto | undefined): number {
  return cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
}

/**
 * Every cart mutation answers with the full cart: write it to the cache and refresh the quote.
 * While newer cart mutations are still queued, their optimistic state stays on screen: writing an
 * older answer would roll the stepper back between rapid clicks. The last answer has the final cart.
 */
function useCartMutationSync() {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  // The mutation being settled still counts as pending.
  const isLast = () =>
    queryClient.isMutating({ predicate: (mutation) => mutation.options.scope?.id === CART_MUTATION_SCOPE.id }) <= 1
  return {
    owner,
    queryClient,
    isLast,
    sync(cart: CartDto) {
      if (!isLast()) return
      queryClient.setQueryData(queryKeys.private.cart(owner), cart)
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.private.all(owner), 'quote'] })
    },
  }
}

export function useAddToCart() {
  const { sync } = useCartMutationSync()
  return useMutation({
    scope: CART_MUTATION_SCOPE,
    mutationFn: (item: AddCartItemRequest) =>
      apiRequest(cartSchema, { method: 'POST', url: '/cart/items', data: item }),
    onSuccess: (cart) => {
      sync(cart)
      announce('Item adicionado ao carrinho.')
    },
  })
}

/** Optimistic quantity change: the stepper reacts instantly and rolls back on failure. */
export function useUpdateCartItem() {
  const { owner, queryClient, isLast, sync } = useCartMutationSync()
  const key = queryKeys.private.cart(owner)
  return useMutation({
    scope: CART_MUTATION_SCOPE,
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiRequest(cartSchema, { method: 'PATCH', url: `/cart/items/${itemId}`, data: { quantity } }),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CartDto>(key)
      if (previous) {
        queryClient.setQueryData<CartDto>(key, {
          ...previous,
          items: previous.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      // Answers of the changes queued before this one were skipped: reload the server cart.
      if (isLast()) {
        void queryClient.invalidateQueries({ queryKey: key })
        void queryClient.invalidateQueries({ queryKey: [...queryKeys.private.all(owner), 'quote'] })
      }
      announce('Não foi possível alterar a quantidade.', 'assertive')
    },
    onSuccess: sync,
  })
}

export function useRemoveCartItem() {
  const { sync } = useCartMutationSync()
  return useMutation({
    scope: CART_MUTATION_SCOPE,
    mutationFn: (itemId: string) => apiRequest(cartSchema, { method: 'DELETE', url: `/cart/items/${itemId}` }),
    onSuccess: (cart) => {
      sync(cart)
      announce('Item removido do carrinho.')
    },
  })
}

export function useApplyCoupon() {
  const { sync } = useCartMutationSync()
  return useMutation({
    scope: CART_MUTATION_SCOPE,
    mutationFn: (code: string) => apiRequest(cartSchema, { method: 'PUT', url: '/cart/coupon', data: { code } }),
    onSuccess: (cart) => {
      sync(cart)
      announce('Cupom aplicado.')
    },
  })
}

export function useRemoveCoupon() {
  const { sync } = useCartMutationSync()
  return useMutation({
    scope: CART_MUTATION_SCOPE,
    mutationFn: () => apiRequest(cartSchema, { method: 'DELETE', url: '/cart/coupon' }),
    onSuccess: (cart) => {
      sync(cart)
      announce('Cupom removido.')
    },
  })
}
