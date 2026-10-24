import { delay, HttpResponse, http } from 'msw'
import { percentOf } from '@/domain/money'
import { diffQuotes, isQuoteExpired } from '@/domain/quote'
import { createOrderRequestSchema } from '@/shared/api/dtos/order'
import { getDb } from '../db/store'
import { apiPath, MockHttpError, notFound, readJson, route, validationError } from '../http/respond'
import { behavior, consumeOnce } from '../scenarios/runtime'
import { resolveCart } from '../services/carts'
import { updateNft } from '../services/catalog'
import { createOrder, findIdempotentOrder, requestFingerprint, settleDueOrders, toOrderDto } from '../services/orders'
import { createQuote, findQuote, toQuoteDto } from '../services/quotes'
import { requireAuth } from '../services/sessions'

/** Applies the scenario's one-shot catalog change right when an order is submitted. */
function applyScenarioChange(line: { nftId: string; editionId: string; unitPrice: string } | undefined) {
  const change = behavior().changeOnOrder
  if (!change || !line || !consumeOnce('change-on-order')) return
  if (change === 'price') {
    updateNft(line.nftId, [{ editionId: line.editionId, price: percentOf(line.unitPrice, '110') }])
  } else {
    updateNft(line.nftId, [{ editionId: line.editionId, available: 0 }])
  }
}

export const orderHandlers = [
  http.post(
    apiPath('/orders'),
    route(async ({ request }) => {
      const auth = requireAuth(request)
      const idempotencyKey = request.headers.get('Idempotency-Key')
      if (!idempotencyKey) throw validationError({ idempotencyKey: 'Cabeçalho Idempotency-Key obrigatório.' })
      const body = await readJson(request, createOrderRequestSchema)

      // Same key: replay the original outcome, or reject a different payload.
      const existing = findIdempotentOrder(auth.user.id, idempotencyKey)
      if (existing) {
        if (existing.record.fingerprint !== requestFingerprint(body)) {
          throw new MockHttpError('IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
        }
        settleDueOrders(auth.user.id)
        const order = getDb().orders.find((item) => item.id === existing.order.id) ?? existing.order
        return HttpResponse.json(toOrderDto(order), { status: 200 })
      }

      const reviewed = findQuote(body.quoteId)
      const cart = resolveCart(request, auth)
      applyScenarioChange(reviewed?.lines.find((line) => line.effectiveQuantity > 0))

      // Revalidate price, stock, coupon and fees against a fresh quote.
      const fresh = createQuote(cart, body.network)
      const stale =
        !reviewed ||
        reviewed.userId !== auth.user.id ||
        isQuoteExpired(reviewed, new Date()) ||
        !fresh.purchasable ||
        diffQuotes(reviewed, fresh).length > 0
      if (stale) {
        throw new MockHttpError('QUOTE_STALE', 'Os valores do pedido mudaram. Revise e confirme novamente.', {
          details: { quote: toQuoteDto(fresh) },
        })
      }

      const wallet = getDb().wallets.find((item) => item.id === body.walletId && item.userId === auth.user.id)
      if (!wallet) throw validationError({ walletId: 'Selecione uma carteira cadastrada.' })

      const order = createOrder({ userId: auth.user.id, idempotencyKey, body, quote: fresh, wallet })

      const holdMs = behavior().firstOrderResponseDelayMs
      if (holdMs !== null && consumeOnce('order-timeout')) await delay(holdMs)
      return HttpResponse.json(toOrderDto(order), { status: 201 })
    }),
  ),

  http.get<{ orderId: string }>(
    apiPath('/orders/:orderId'),
    route<{ orderId: string }>(({ request, params }) => {
      const { user } = requireAuth(request)
      settleDueOrders(user.id)
      const order = getDb().orders.find((item) => item.id === params.orderId)
      if (!order) throw notFound('Pedido não encontrado.')
      if (order.userId !== user.id) throw new MockHttpError('FORBIDDEN', 'Este pedido pertence a outra conta.')
      return HttpResponse.json(toOrderDto(order))
    }),
  ),
]
