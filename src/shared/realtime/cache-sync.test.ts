import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildCatalog } from '@/mocks/fixtures/catalog'
import { type CartDto } from '../api/dtos/cart'
import { type NftUpdatedEvent, type OrderUpdatedEvent } from '../api/dtos/events'
import { type OrderDto } from '../api/dtos/order'
import { queryKeys, userOwner } from '../api/query-keys'
import { sessionStore } from '../session/session-store'
import { applyNftUpdated, applyOrderUpdated } from './cache-sync'
import { realtimeStore } from './realtime-store'

const nft = buildCatalog()[0]
if (!nft) throw new Error('fixture missing')
const edition = nft.editions[0]
if (!edition) throw new Error('fixture missing')
const owner = userOwner('user_alice')

function nftEvent(version: number, price: string, available = edition?.available ?? 1): NftUpdatedEvent {
  return {
    eventId: `evt_${version}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: nft?.id ?? '' },
    version,
    occurredAt: '2026-01-01T00:00:00.000Z',
    userId: null,
    data: {
      price,
      compareAtPrice: null,
      available,
      availability: available > 0 ? 'available' : 'sold-out',
      editions: [{ id: edition?.id ?? '', price, compareAtPrice: null, available }],
    },
  }
}

const cart: CartDto = {
  id: 'cart_1',
  couponCode: null,
  version: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [
    {
      id: 'item_1',
      nftId: nft.id,
      editionId: edition.id,
      quantity: 1,
      unitPrice: edition.price,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      name: nft.name,
      editionLabel: edition.label,
      creatorName: nft.creator.name,
      image: nft.image,
      addedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient()
  realtimeStore.reset()
  sessionStore.signIn({
    token: 't',
    expiresAt: '2030-01-01T00:00:00.000Z',
    user: { id: 'user_alice', email: 'alice@nft.test', username: 'alice', displayName: 'Alice', avatarUrl: null },
  })
})

describe('applyNftUpdated', () => {
  it('patches detail, lists and cart, and records a notice', () => {
    queryClient.setQueryData(queryKeys.nfts.detail(nft.id), nft)
    queryClient.setQueryData(queryKeys.nfts.list({ page: 1 }), {
      items: [{ ...nft }],
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    })
    queryClient.setQueryData(queryKeys.private.cart(owner), cart)

    applyNftUpdated(queryClient, nftEvent(nft.version + 1, '7.77'))

    expect(queryClient.getQueryData<typeof nft>(queryKeys.nfts.detail(nft.id))?.editions[0]?.price).toBe('7.77')
    expect(queryClient.getQueryData<{ items: (typeof nft)[] }>(queryKeys.nfts.list({ page: 1 }))?.items[0]?.price).toBe(
      '7.77',
    )
    expect(queryClient.getQueryData<CartDto>(queryKeys.private.cart(owner))?.items[0]?.unitPrice).toBe('7.77')
    expect(realtimeStore.getState().cartNotices).toMatchObject([{ previousPrice: edition.price, price: '7.77' }])
  })

  it('never regresses a newer cached version', () => {
    queryClient.setQueryData(queryKeys.nfts.detail(nft.id), { ...nft, version: 10 })
    applyNftUpdated(queryClient, nftEvent(9, '1.23'))
    expect(queryClient.getQueryData<typeof nft>(queryKeys.nfts.detail(nft.id))?.price).toBe(nft.price)
  })
})

describe('applyOrderUpdated', () => {
  const order = { id: 'order_1', status: 'confirmed', version: 3 } as OrderDto
  const event = (status: OrderDto['status'], version: number): OrderUpdatedEvent => ({
    eventId: `evt_o${version}`,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version,
    occurredAt: '2026-01-01T00:00:00.000Z',
    userId: 'user_alice',
    data: { status, declineReason: null },
  })

  it('keeps terminal states', () => {
    queryClient.setQueryData(queryKeys.private.order(owner, order.id), order)
    applyOrderUpdated(queryClient, event('declined', 4))
    expect(queryClient.getQueryData<OrderDto>(queryKeys.private.order(owner, order.id))?.status).toBe('confirmed')
  })

  it('moves pending orders forward', () => {
    queryClient.setQueryData(queryKeys.private.order(owner, order.id), { ...order, status: 'pending', version: 1 })
    applyOrderUpdated(queryClient, event('confirmed', 2))
    expect(queryClient.getQueryData<OrderDto>(queryKeys.private.order(owner, order.id))?.status).toBe('confirmed')
  })
})
