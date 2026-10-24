import { type CartLineIssue, lineKey, validateLine } from './cart'
import { add, compare, type EthAmount, equals, min, multiply, percentOf, subtract, sum } from './money'
import { maxLineQuantity } from './nft'

export interface Coupon {
  readonly code: string
  readonly kind: 'percent' | 'fixed'
  /** Percentage ("10" = 10%) or fixed ETH amount, as a decimal string. */
  readonly value: string
  readonly expiresAt: string
  readonly minSubtotal?: EthAmount
}

export type CouponRejection = 'not-found' | 'expired' | 'min-subtotal'

export type CouponEvaluation =
  | { readonly ok: true; readonly discount: EthAmount }
  | { readonly ok: false; readonly reason: CouponRejection }

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function evaluateCoupon(coupon: Coupon | undefined, subtotal: EthAmount, now: Date): CouponEvaluation {
  if (!coupon) return { ok: false, reason: 'not-found' }
  if (Date.parse(coupon.expiresAt) <= now.getTime()) return { ok: false, reason: 'expired' }
  if (coupon.minSubtotal && compare(subtotal, coupon.minSubtotal) < 0) return { ok: false, reason: 'min-subtotal' }

  const raw = coupon.kind === 'percent' ? percentOf(subtotal, coupon.value) : coupon.value
  // A discount never exceeds the subtotal.
  return { ok: true, discount: min(raw, subtotal) }
}

export interface QuoteLineInput {
  readonly nftId: string
  readonly editionId: string
  readonly quantity: number
  readonly unitPrice: EthAmount
  readonly available: number
  readonly maxPerOrder: number
}

export interface QuoteLine extends QuoteLineInput {
  /** Quantity actually purchasable right now (clamped to stock and per-order cap). */
  readonly effectiveQuantity: number
  readonly lineTotal: EthAmount
  readonly issue: CartLineIssue | null
}

export interface QuoteInput {
  readonly lines: readonly QuoteLineInput[]
  readonly networkFee: EthAmount
  readonly couponCode?: string | undefined
  readonly coupon?: Coupon | undefined
  readonly now: Date
}

export interface QuoteTotals {
  readonly lines: readonly QuoteLine[]
  readonly subtotal: EthAmount
  readonly discount: EthAmount
  readonly networkFee: EthAmount
  readonly total: EthAmount
  readonly appliedCoupon: string | null
  readonly couponRejection: CouponRejection | null
  /** True when every line can be bought exactly as requested. */
  readonly purchasable: boolean
}

export function computeQuote(input: QuoteInput): QuoteTotals {
  const lines: QuoteLine[] = input.lines.map((line) => {
    const issue = validateLine(line, line)
    const effectiveQuantity = Math.min(line.quantity, maxLineQuantity(line))
    return {
      ...line,
      issue,
      effectiveQuantity: Math.max(effectiveQuantity, 0),
      lineTotal: multiply(line.unitPrice, Math.max(effectiveQuantity, 0)),
    }
  })

  const subtotal = sum(lines.map((line) => line.lineTotal))
  const hasItems = lines.some((line) => line.effectiveQuantity > 0)
  const networkFee = hasItems ? input.networkFee : '0'

  let discount: EthAmount = '0'
  let appliedCoupon: string | null = null
  let couponRejection: CouponRejection | null = null
  if (input.couponCode) {
    const evaluation = evaluateCoupon(input.coupon, subtotal, input.now)
    if (evaluation.ok) {
      discount = evaluation.discount
      appliedCoupon = normalizeCouponCode(input.couponCode)
    } else {
      couponRejection = evaluation.reason
    }
  }

  return {
    lines,
    subtotal,
    discount,
    networkFee,
    total: add(subtract(subtotal, discount), networkFee),
    appliedCoupon,
    couponRejection,
    purchasable: hasItems && lines.every((line) => line.issue === null),
  }
}

export interface QuoteSnapshot {
  readonly lines: readonly Pick<QuoteLine, 'nftId' | 'editionId' | 'unitPrice' | 'effectiveQuantity' | 'issue'>[]
  readonly discount: EthAmount
  readonly networkFee: EthAmount
  readonly total: EthAmount
  readonly expiresAt: string
}

export type QuoteChange =
  | { readonly kind: 'price'; readonly key: string; readonly from: EthAmount; readonly to: EthAmount }
  | { readonly kind: 'availability'; readonly key: string; readonly from: number; readonly to: number }
  | { readonly kind: 'line-added' | 'line-removed'; readonly key: string }
  | { readonly kind: 'discount' | 'network-fee' | 'total'; readonly from: EthAmount; readonly to: EthAmount }

/** Lists what changed between the quote the user reviewed and a fresh one. */
export function diffQuotes(reviewed: QuoteSnapshot, fresh: QuoteSnapshot): QuoteChange[] {
  const changes: QuoteChange[] = []
  const freshByKey = new Map(fresh.lines.map((line) => [lineKey(line), line]))
  const reviewedKeys = new Set<string>()

  for (const line of reviewed.lines) {
    const key = lineKey(line)
    reviewedKeys.add(key)
    const next = freshByKey.get(key)
    if (!next) {
      changes.push({ kind: 'line-removed', key })
      continue
    }
    if (!equals(line.unitPrice, next.unitPrice)) {
      changes.push({ kind: 'price', key, from: line.unitPrice, to: next.unitPrice })
    }
    if (line.effectiveQuantity !== next.effectiveQuantity) {
      changes.push({ kind: 'availability', key, from: line.effectiveQuantity, to: next.effectiveQuantity })
    }
  }
  for (const key of freshByKey.keys()) {
    if (!reviewedKeys.has(key)) changes.push({ kind: 'line-added', key })
  }

  if (!equals(reviewed.discount, fresh.discount)) {
    changes.push({ kind: 'discount', from: reviewed.discount, to: fresh.discount })
  }
  if (!equals(reviewed.networkFee, fresh.networkFee)) {
    changes.push({ kind: 'network-fee', from: reviewed.networkFee, to: fresh.networkFee })
  }
  if (!equals(reviewed.total, fresh.total)) {
    changes.push({ kind: 'total', from: reviewed.total, to: fresh.total })
  }
  return changes
}

export function isQuoteExpired(quote: Pick<QuoteSnapshot, 'expiresAt'>, now: Date): boolean {
  return Date.parse(quote.expiresAt) <= now.getTime()
}
