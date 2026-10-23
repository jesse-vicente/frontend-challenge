// @vitest-environment happy-dom
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { apiRequest, http as httpClient, registerAuthBridge } from '@/shared/api/client'
import { type Session, sessionSchema } from '@/shared/api/dtos/auth'
import { cartSchema } from '@/shared/api/dtos/cart'
import { nftListResponseSchema } from '@/shared/api/dtos/nft'
import { orderSchema } from '@/shared/api/dtos/order'
import { quoteSchema } from '@/shared/api/dtos/quote'
import { type ApiError, isApiError } from '@/shared/api/errors'
import { mockControl } from '../control'
import { DEMO_PASSWORD } from '../fixtures/accounts'
import { cancelAllTimers, settleOrder } from '../services/orders'
import { restHandlers } from '.'

const server = setupServer(...restHandlers)
let token: string | null = null
let guestCartId: string | null = null
let invalidSessions: string[] = []

beforeAll(() => {
  httpClient.defaults.baseURL = `${window.location.origin}/api`
  server.listen({ onUnhandledRequest: 'error' })
  registerAuthBridge({
    getAccessToken: () => token,
    getGuestCartId: () => guestCartId,
    onSessionInvalid: (reason) => invalidSessions.push(reason),
  })
})

beforeEach(async () => {
  await mockControl.reset('default')
  mockControl.setLatency(0)
  token = null
  guestCartId = null
  invalidSessions = []
})

afterEach(() => cancelAllTimers())
afterAll(() => server.close())

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (isApiError(error)) return error
    throw error
  }
  throw new Error('Expected request to fail')
}

async function login(email: string): Promise<Session> {
  const session = await apiRequest(sessionSchema, {
    method: 'POST',
    url: '/auth/login',
    data: { email, password: DEMO_PASSWORD, guestCartId: guestCartId ?? undefined },
  })
  token = session.token
  return session
}

const getCart = () => apiRequest(cartSchema, { url: '/cart' })
const addItem = (nftId: string, editionId: string, quantity = 1) =>
  apiRequest(cartSchema, { method: 'POST', url: '/cart/items', data: { nftId, editionId, quantity } })
const createQuote = () => apiRequest(quoteSchema, { method: 'POST', url: '/quote', data: { network: 'ethereum' } })

const collector = { fullName: 'Alice Martins', email: 'alice@nft.test', country: 'Brasil' }

describe('catalog', () => {
  it('filters, sorts and paginates', async () => {
    const page = await apiRequest(nftListResponseSchema, {
      url: '/nfts',
      params: { categories: ['digital-art', 'music'], availability: 'available', sort: 'price-asc', pageSize: 5 },
    })
    expect(page.items.length).toBeLessThanOrEqual(5)
    expect(page.items.every((nft) => ['digital-art', 'music'].includes(nft.category) && nft.available > 0)).toBe(true)
    const prices = page.items.map((nft) => Number(nft.price))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('returns 404 for unknown NFTs', async () => {
    const error = await expectApiError(apiRequest(cartSchema, { url: '/nfts/nope' }))
    expect(error.code).toBe('NOT_FOUND')
  })
})

describe('session', () => {
  it('rejects wrong credentials and restores a valid session', async () => {
    const error = await expectApiError(
      apiRequest(sessionSchema, {
        method: 'POST',
        url: '/auth/login',
        data: { email: 'alice@nft.test', password: 'x' },
      }),
    )
    expect(error.code).toBe('UNAUTHENTICATED')

    await login('alice@nft.test')
    const restored = await apiRequest(sessionSchema, { url: '/auth/session' })
    expect(restored.user.username).toBe('alice')
  })

  it('reports expired sessions through the auth bridge', async () => {
    await login('alice@nft.test')
    mockControl.expireSession()
    const error = await expectApiError(apiRequest(sessionSchema, { url: '/auth/session' }))
    expect(error.code).toBe('SESSION_EXPIRED')
    expect(invalidSessions).toEqual(['SESSION_EXPIRED'])
  })

  it('reports register conflicts per field', async () => {
    const error = await expectApiError(
      apiRequest(sessionSchema, {
        method: 'POST',
        url: '/auth/register',
        data: { username: 'alice', email: 'alice@nft.test', password: 'Senha123' },
      }),
    )
    expect(error.code).toBe('CONFLICT')
    expect(Object.keys(error.fields ?? {})).toEqual(['email', 'username'])
  })
})

describe('cart', () => {
  it('keeps the guest cart and merges it on login', async () => {
    const guest = await getCart()
    guestCartId = guest.id
    await addItem('nft_001', 'nft_001_1-50')
    await login('alice@nft.test')
    guestCartId = null
    const cart = await getCart()
    expect(cart.items.map((item) => item.editionId)).toContain('nft_001_1-50')
  })

  it('rejects quantities above stock', async () => {
    const error = await expectApiError(addItem('nft_001', 'nft_001_1-50', 999))
    expect(error.code).toBe('OUT_OF_STOCK')
  })

  it('validates coupons', async () => {
    await login('alice@nft.test')
    await addItem('nft_001', 'nft_001_1-50')
    const apply = (code: string) => apiRequest(cartSchema, { method: 'PUT', url: '/cart/coupon', data: { code } })
    expect((await expectApiError(apply('NOPE'))).code).toBe('COUPON_INVALID')
    expect((await expectApiError(apply('EXPIRED20'))).code).toBe('COUPON_EXPIRED')
    expect((await apply('welcome10')).couponCode).toBe('WELCOME10')
    const quote = await createQuote()
    expect(quote.appliedCoupon).toBe('WELCOME10')
    expect(Number(quote.discount)).toBeGreaterThan(0)
  })
})

describe('orders', () => {
  async function prepareCheckout() {
    await login('alice@nft.test')
    await addItem('nft_001', 'nft_001_1-50')
    return createQuote()
  }

  const submit = (quoteId: string, key: string, walletId = 'wallet_alice_primary') =>
    apiRequest(orderSchema, {
      method: 'POST',
      url: '/orders',
      headers: { 'Idempotency-Key': key },
      data: { quoteId, walletId, network: 'ethereum', collector },
    })

  it('replays the same order for the same key and rejects different content', async () => {
    const quote = await prepareCheckout()
    const first = await submit(quote.quoteId, 'key-1')
    const replay = await submit(quote.quoteId, 'key-1')
    expect(replay.id).toBe(first.id)
    const conflict = await expectApiError(submit(quote.quoteId, 'key-1', 'wallet_alice_secondary'))
    expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT')
  })

  it('confirms the order and removes only purchased items from the cart', async () => {
    const quote = await prepareCheckout()
    const order = await submit(quote.quoteId, 'key-2')
    expect(order.status).toBe('pending')
    settleOrder(order.id)
    const settled = await apiRequest(orderSchema, { url: `/orders/${order.id}` })
    expect(settled.status).toBe('confirmed')
    expect(settled.transaction?.hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect((await getCart()).items).toHaveLength(0)
  })

  it('rejects a stale quote after a price change', async () => {
    const quote = await prepareCheckout()
    mockControl.updateNft('nft_001', [{ editionId: 'nft_001_1-50', price: '9.99' }])
    const error = await expectApiError(submit(quote.quoteId, 'key-3'))
    expect(error.code).toBe('QUOTE_STALE')
    expect(quoteSchema.parse((error.details as { quote: unknown }).quote).lines[0]?.unitPrice).toBe('9.99')
  })

  it('isolates orders between users', async () => {
    const quote = await prepareCheckout()
    const order = await submit(quote.quoteId, 'key-4')
    await login('bob@nft.test')
    const error = await expectApiError(apiRequest(orderSchema, { url: `/orders/${order.id}` }))
    expect(error.code).toBe('FORBIDDEN')
  })
})
