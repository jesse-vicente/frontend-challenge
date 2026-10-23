import { type EthAmount, multiply } from './money'
import { clampQuantity, type EditionStock, maxLineQuantity } from './nft'

export interface CartLineRef {
  readonly nftId: string
  readonly editionId: string
  readonly quantity: number
}

export type CartLineIssue =
  | { readonly kind: 'sold-out' }
  | { readonly kind: 'quantity-reduced'; readonly requested: number; readonly allowed: number }
  | { readonly kind: 'invalid-quantity' }

export function lineKey(line: Pick<CartLineRef, 'nftId' | 'editionId'>): string {
  return `${line.nftId}:${line.editionId}`
}

export function lineSubtotal(unitPrice: EthAmount, quantity: number): EthAmount {
  return multiply(unitPrice, quantity)
}

/** Checks a line against current stock; returns null when the line is valid as-is. */
export function validateLine(
  line: Pick<CartLineRef, 'quantity'>,
  stock: Pick<EditionStock, 'available' | 'maxPerOrder'>,
): CartLineIssue | null {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) return { kind: 'invalid-quantity' }
  const allowed = maxLineQuantity(stock)
  if (allowed === 0) return { kind: 'sold-out' }
  if (line.quantity > allowed) return { kind: 'quantity-reduced', requested: line.quantity, allowed }
  return null
}

/**
 * Merges a guest cart into the user's cart. Quantities of the same edition are
 * summed and clamped to stock; editions with no stock are dropped.
 */
export function mergeLines<T extends CartLineRef>(
  target: readonly T[],
  incoming: readonly T[],
  stockOf: (line: CartLineRef) => Pick<EditionStock, 'available' | 'maxPerOrder'> | undefined,
): T[] {
  const merged = new Map<string, T>()
  for (const line of [...target, ...incoming]) {
    const key = lineKey(line)
    const current = merged.get(key)
    merged.set(key, current ? { ...current, quantity: current.quantity + line.quantity } : line)
  }

  const result: T[] = []
  for (const line of merged.values()) {
    const stock = stockOf(line)
    if (!stock) continue
    const quantity = clampQuantity(line.quantity, maxLineQuantity(stock))
    if (quantity > 0) result.push({ ...line, quantity })
  }
  return result
}

/**
 * Removes purchased quantities from the cart, keeping anything that was not bought
 * (e.g. items added in another tab while the order was pending).
 */
export function subtractPurchased<T extends CartLineRef>(cart: readonly T[], purchased: readonly CartLineRef[]): T[] {
  const bought = new Map<string, number>()
  for (const line of purchased) bought.set(lineKey(line), (bought.get(lineKey(line)) ?? 0) + line.quantity)

  const remaining: T[] = []
  for (const line of cart) {
    const key = lineKey(line)
    const consumed = Math.min(bought.get(key) ?? 0, line.quantity)
    if (consumed > 0) bought.set(key, (bought.get(key) ?? 0) - consumed)
    const quantity = line.quantity - consumed
    if (quantity > 0) remaining.push({ ...line, quantity })
  }
  return remaining
}
