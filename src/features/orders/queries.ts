import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { isTerminal } from '@/domain/order'
import { apiRequest } from '@/shared/api/client'
import { type CreateOrderRequest, type OrderDto, orderSchema } from '@/shared/api/dtos/order'
import { type CacheOwner, queryKeys } from '@/shared/api/query-keys'
import { eventGuard } from '@/shared/realtime/realtime-store'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'
import { idempotencyKeyFor, rememberPendingOrder } from './attempt'

/** Shorter than the global timeout: a slow order response is retried with the same key. */
export const ORDER_TIMEOUT_MS = 8000
/** Safety net while pending, in case a realtime event is lost. */
const PENDING_REFETCH_MS = 10_000

export const orderQuery = (owner: CacheOwner, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.private.order(owner, orderId),
    queryFn: async ({ signal }) => {
      const order = await apiRequest(orderSchema, { url: `/orders/${encodeURIComponent(orderId)}`, signal })
      eventGuard.observe({ type: 'order', id: order.id }, order.version)
      return order
    },
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && !isTerminal(status) ? PENDING_REFETCH_MS : false
    },
  })

/**
 * Creates the order with an idempotency key bound to this attempt. Retrying after
 * a timeout sends the same key and payload, so the API returns the original order.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  const user = useSessionUser()

  return useMutation({
    mutationKey: ['create-order'],
    mutationFn: (payload: CreateOrderRequest) => {
      if (!user) throw new Error('Login required to place an order')
      return apiRequest(orderSchema, {
        method: 'POST',
        url: '/orders',
        data: payload,
        timeout: ORDER_TIMEOUT_MS,
        headers: { 'Idempotency-Key': idempotencyKeyFor(user.id, payload) },
      })
    },
    onSuccess: (order: OrderDto) => {
      if (user) rememberPendingOrder(user.id, order.id)
      queryClient.setQueryData(queryKeys.private.order(owner, order.id), order)
      eventGuard.observe({ type: 'order', id: order.id }, order.version)
    },
  })
}
