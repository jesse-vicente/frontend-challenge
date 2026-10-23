import { HttpResponse, http } from 'msw'
import { lineKey, lineSubtotal } from '@/domain/cart'
import { sum } from '@/domain/money'
import { maxLineQuantity } from '@/domain/nft'
import { evaluateCoupon, normalizeCouponCode } from '@/domain/quote'
import { addCartItemRequestSchema, applyCouponRequestSchema, updateCartItemRequestSchema } from '@/shared/api/dtos/cart'
import { createQuoteRequestSchema } from '@/shared/api/dtos/quote'
import { getDb, nextId } from '../db/store'
import { type CartRecord } from '../db/types'
import { apiPath, MockHttpError, notFound, readJson, route } from '../http/respond'
import { resolveCart, toCartDto, touchCart } from '../services/carts'
import { findEdition, requireNft } from '../services/catalog'
import { createQuote, toQuoteDto } from '../services/quotes'
import { optionalAuth } from '../services/sessions'

function requireEdition(nftId: string, editionId: string) {
  const nft = requireNft(nftId)
  const edition = findEdition(nft, editionId)
  if (!edition) throw notFound('Edição não encontrada.')
  return edition
}

function assertStock(edition: { available: number; maxPerOrder: number }, quantity: number) {
  const allowed = maxLineQuantity(edition)
  if (allowed === 0) {
    throw new MockHttpError('OUT_OF_STOCK', 'Esta edição está esgotada.', { details: { allowed } })
  }
  if (quantity > allowed) {
    throw new MockHttpError('OUT_OF_STOCK', `Quantidade máxima disponível: ${allowed}.`, {
      fields: { quantity: `Máximo de ${allowed} unidade(s).` },
      details: { allowed },
    })
  }
}

function cartSubtotal(cart: CartRecord): string {
  return sum(
    cart.items.map((item) => {
      const nft = requireNft(item.nftId)
      const edition = findEdition(nft, item.editionId)
      return edition ? lineSubtotal(edition.price, item.quantity) : '0'
    }),
  )
}

export const cartHandlers = [
  http.get(
    apiPath('/cart'),
    route(({ request }) => HttpResponse.json(toCartDto(resolveCart(request, optionalAuth(request))))),
  ),

  http.post(
    apiPath('/cart/items'),
    route(async ({ request }) => {
      const cart = resolveCart(request, optionalAuth(request))
      const body = await readJson(request, addCartItemRequestSchema)
      const edition = requireEdition(body.nftId, body.editionId)
      const existing = cart.items.find((item) => lineKey(item) === lineKey(body))
      assertStock(edition, (existing?.quantity ?? 0) + body.quantity)

      const updated = touchCart(cart.id, (draft) => {
        const line = draft.items.find((item) => lineKey(item) === lineKey(body))
        if (line) line.quantity += body.quantity
        else draft.items.push({ id: nextId('item'), ...body, addedAt: new Date().toISOString() })
      })
      return HttpResponse.json(toCartDto(updated), { status: 201 })
    }),
  ),

  http.patch<{ itemId: string }>(
    apiPath('/cart/items/:itemId'),
    route<{ itemId: string }>(async ({ request, params }) => {
      const cart = resolveCart(request, optionalAuth(request))
      const body = await readJson(request, updateCartItemRequestSchema)
      const line = cart.items.find((item) => item.id === params.itemId)
      if (!line) throw notFound('Item não está no carrinho.')
      assertStock(requireEdition(line.nftId, line.editionId), body.quantity)

      const updated = touchCart(cart.id, (draft) => {
        const target = draft.items.find((item) => item.id === params.itemId)
        if (target) target.quantity = body.quantity
      })
      return HttpResponse.json(toCartDto(updated))
    }),
  ),

  http.delete<{ itemId: string }>(
    apiPath('/cart/items/:itemId'),
    route<{ itemId: string }>(({ request, params }) => {
      const cart = resolveCart(request, optionalAuth(request))
      if (!cart.items.some((item) => item.id === params.itemId)) throw notFound('Item não está no carrinho.')
      const updated = touchCart(cart.id, (draft) => {
        draft.items = draft.items.filter((item) => item.id !== params.itemId)
        if (draft.items.length === 0) draft.couponCode = null
      })
      return HttpResponse.json(toCartDto(updated))
    }),
  ),

  http.put(
    apiPath('/cart/coupon'),
    route(async ({ request }) => {
      const cart = resolveCart(request, optionalAuth(request))
      const { code } = await readJson(request, applyCouponRequestSchema)
      const normalized = normalizeCouponCode(code)
      const coupon = getDb().coupons.find((item) => item.code === normalized)
      const evaluation = evaluateCoupon(coupon, cartSubtotal(cart), new Date())

      if (!evaluation.ok) {
        if (evaluation.reason === 'expired') {
          throw new MockHttpError('COUPON_EXPIRED', 'Este cupom expirou.', { fields: { code: 'Este cupom expirou.' } })
        }
        const message =
          evaluation.reason === 'min-subtotal'
            ? `Subtotal mínimo de ${coupon?.minSubtotal ?? ''} ETH para este cupom.`
            : 'Cupom inválido.'
        throw new MockHttpError('COUPON_INVALID', message, { fields: { code: message } })
      }

      const updated = touchCart(cart.id, (draft) => {
        draft.couponCode = normalized
      })
      return HttpResponse.json(toCartDto(updated))
    }),
  ),

  http.delete(
    apiPath('/cart/coupon'),
    route(({ request }) => {
      const cart = resolveCart(request, optionalAuth(request))
      const updated = touchCart(cart.id, (draft) => {
        draft.couponCode = null
      })
      return HttpResponse.json(toCartDto(updated))
    }),
  ),

  http.post(
    apiPath('/quote'),
    route(async ({ request }) => {
      const cart = resolveCart(request, optionalAuth(request))
      const { network } = await readJson(request, createQuoteRequestSchema)
      return HttpResponse.json(toQuoteDto(createQuote(cart, network)), { status: 201 })
    }),
  ),
]
