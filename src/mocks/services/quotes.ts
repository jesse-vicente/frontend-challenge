import { computeQuote, normalizeCouponCode } from '@/domain/quote'
import { type Network } from '@/shared/api/dtos/network'
import { type QuoteDto } from '@/shared/api/dtos/quote'
import { getDb, mutate, nextId } from '../db/store'
import { type CartRecord, type QuoteRecord } from '../db/types'
import { findEdition, findNft } from './catalog'

/** Simulated gas cost per network, in ETH. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.0042',
  polygon: '0.0004',
  arbitrum: '0.0011',
}

export const QUOTE_TTL_MS = 5 * 60 * 1000
const MAX_STORED_QUOTES = 50

/** Prices the cart with live catalog data; the result is the reference for checkout. */
export function createQuote(cart: CartRecord, network: Network): QuoteRecord {
  const db = getDb()
  const items = cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    return nft && edition ? [{ item, nft, edition }] : []
  })

  const coupon = cart.couponCode
    ? db.coupons.find((candidate) => candidate.code === normalizeCouponCode(cart.couponCode ?? ''))
    : undefined
  const now = new Date()
  const totals = computeQuote({
    lines: items.map(({ item, edition }) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPrice: edition.price,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
    })),
    networkFee: NETWORK_FEES[network],
    couponCode: cart.couponCode ?? undefined,
    coupon,
    now,
  })

  const quote: QuoteRecord = {
    quoteId: nextId('quote'),
    cartId: cart.id,
    userId: cart.userId,
    cartVersion: cart.version,
    network,
    lines: totals.lines.map((line, index) => ({
      cartItemId: items[index]?.item.id ?? '',
      nftId: line.nftId,
      editionId: line.editionId,
      name: items[index]?.nft.name ?? '',
      quantity: line.quantity,
      effectiveQuantity: line.effectiveQuantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      issue: line.issue,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    networkFee: totals.networkFee,
    total: totals.total,
    appliedCoupon: totals.appliedCoupon,
    couponRejection: totals.couponRejection,
    purchasable: totals.purchasable,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  }

  mutate((state) => {
    state.quotes.push(quote)
    if (state.quotes.length > MAX_STORED_QUOTES) state.quotes.splice(0, state.quotes.length - MAX_STORED_QUOTES)
  })
  return quote
}

export function toQuoteDto(quote: QuoteRecord): QuoteDto {
  const { cartId: _cartId, userId: _userId, ...dto } = quote
  return dto
}

export function findQuote(quoteId: string): QuoteRecord | undefined {
  return getDb().quotes.find((quote) => quote.quoteId === quoteId)
}
