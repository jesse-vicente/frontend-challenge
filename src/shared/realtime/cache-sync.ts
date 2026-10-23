import { type QueryClient } from '@tanstack/react-query'
import { reconcileOrderState } from '@/domain/order'
import { announce } from '../a11y/announcer'
import { type CartDto } from '../api/dtos/cart'
import { type NftUpdatedEvent, type OrderUpdatedEvent } from '../api/dtos/events'
import { type NftDetailDto, type NftHighlightsDto, type NftListResponse, type NftSummaryDto } from '../api/dtos/nft'
import { type OrderDto } from '../api/dtos/order'
import { queryKeys } from '../api/query-keys'
import { formatEth } from '../lib/format'
import { currentCacheOwner } from '../session/cache-owner'
import { type PriceChangeNotice, realtimeStore } from './realtime-store'

function patchSummary<T extends NftSummaryDto>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.resource.id || item.version >= event.version) return item
  const { price, compareAtPrice, available, availability } = event.data
  return { ...item, price, compareAtPrice, available, availability, version: event.version }
}

/** Applies `nft.updated` to catalog, detail and cart caches without refetching. */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): void {
  queryClient.setQueryData<NftDetailDto>(queryKeys.nfts.detail(event.resource.id), (detail) => {
    if (!detail || detail.version >= event.version) return detail
    const editions = detail.editions.map((edition) => {
      const patch = event.data.editions.find((item) => item.id === edition.id)
      return patch
        ? { ...edition, price: patch.price, compareAtPrice: patch.compareAtPrice, available: patch.available }
        : edition
    })
    return { ...patchSummary(detail, event), editions }
  })

  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (page) =>
    page ? { ...page, items: page.items.map((item) => patchSummary(item, event)) } : page,
  )
  queryClient.setQueryData<NftHighlightsDto>(queryKeys.nfts.highlights(), (highlights) =>
    highlights
      ? {
          featured: highlights.featured && patchSummary(highlights.featured, event),
          items: highlights.items.map((item) => patchSummary(item, event)),
        }
      : highlights,
  )

  const owner = currentCacheOwner()
  if (!owner) return
  const cart = queryClient.getQueryData<CartDto>(queryKeys.private.cart(owner))
  if (!cart?.items.some((item) => item.nftId === event.resource.id)) return

  const notices: PriceChangeNotice[] = []
  const items = cart.items.map((item) => {
    if (item.nftId !== event.resource.id) return item
    const patch = event.data.editions.find((edition) => edition.id === item.editionId)
    if (!patch || (patch.price === item.unitPrice && patch.available === item.available)) return item
    notices.push({
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      previousPrice: patch.price === item.unitPrice ? null : item.unitPrice,
      price: patch.price,
      previousAvailable: patch.available === item.available ? null : item.available,
      available: patch.available,
      at: event.occurredAt,
    })
    return { ...item, unitPrice: patch.price, available: patch.available }
  })
  if (notices.length === 0) return

  queryClient.setQueryData<CartDto>(queryKeys.private.cart(owner), { ...cart, items })
  // Totals come from the API: any open quote is now outdated.
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.private.all(owner), 'quote'] })
  realtimeStore.pushCartNotices(notices)
  for (const notice of notices) {
    announce(
      notice.available === 0
        ? `${notice.name} esgotou.`
        : notice.previousPrice !== null
          ? `O preço de ${notice.name} mudou para ${formatEth(notice.price)}.`
          : `A disponibilidade de ${notice.name} mudou para ${notice.available}.`,
    )
  }
}

/** Applies `order.updated` for the current user; terminal states never regress. */
export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent): void {
  const owner = currentCacheOwner()
  if (!owner) return
  const key = queryKeys.private.order(owner, event.resource.id)

  queryClient.setQueryData<OrderDto>(key, (order) =>
    order
      ? reconcileOrderState(order, {
          ...order,
          status: event.data.status,
          declineReason: event.data.declineReason,
          version: event.version,
        })
      : order,
  )
  // The event carries the status only; fetch the receipt (transaction, totals).
  void queryClient.invalidateQueries({ queryKey: key })
  if (event.data.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(owner) })
    announce('Pagamento confirmado.', 'assertive')
  } else if (event.data.status === 'declined') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(owner) })
    announce('Pagamento recusado.', 'assertive')
  }
}
