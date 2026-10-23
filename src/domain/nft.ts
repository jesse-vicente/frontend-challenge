import { type EthAmount } from './money'

/** Minimal stock shape the rules need; transport DTOs satisfy it structurally. */
export interface EditionStock {
  readonly price: EthAmount
  /** Units still available for sale. */
  readonly available: number
  /** Upper bound per order, independent of stock. */
  readonly maxPerOrder: number
}

export type EditionAvailability = 'available' | 'low-stock' | 'sold-out'

export const LOW_STOCK_THRESHOLD = 3

export function availabilityOf(edition: Pick<EditionStock, 'available'>): EditionAvailability {
  if (edition.available <= 0) return 'sold-out'
  if (edition.available <= LOW_STOCK_THRESHOLD) return 'low-stock'
  return 'available'
}

export function isPurchasable(edition: Pick<EditionStock, 'available'>): boolean {
  return edition.available > 0
}

/**
 * How many more units the buyer may add, considering stock, the per-order cap
 * and what is already in the cart for the same edition.
 */
export function remainingPurchasable(
  edition: Pick<EditionStock, 'available' | 'maxPerOrder'>,
  alreadyInCart = 0,
): number {
  const ceiling = Math.min(Math.max(edition.available, 0), Math.max(edition.maxPerOrder, 0))
  return Math.max(ceiling - alreadyInCart, 0)
}

/** Maximum quantity a single cart line may hold for this edition. */
export function maxLineQuantity(edition: Pick<EditionStock, 'available' | 'maxPerOrder'>): number {
  return remainingPurchasable(edition, 0)
}

/** Clamps a requested quantity to an integer in [1, max], or 0 when nothing can be bought. */
export function clampQuantity(requested: number, max: number): number {
  if (max <= 0) return 0
  const integer = Number.isFinite(requested) ? Math.trunc(requested) : 1
  return Math.min(Math.max(integer, 1), max)
}
