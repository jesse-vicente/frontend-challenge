import { subtractPurchased } from '@/domain/cart'
import { payloadFingerprint } from '@/domain/idempotency'
import { isTerminal } from '@/domain/order'
import { type OrderUpdatedEvent } from '@/shared/api/dtos/events'
import { type Network } from '@/shared/api/dtos/network'
import { type CreateOrderRequest, type OrderDto } from '@/shared/api/dtos/order'
import { getDb, mutate, nextId } from '../db/store'
import { type OrderRecord, type QuoteRecord, type WalletRecord } from '../db/types'
import { buildEvent, publish } from '../realtime/publisher'
import { behavior } from '../scenarios/runtime'
import { touchCart } from './carts'
import { type EditionPatch, findEdition, requireNft, updateNft } from './catalog'

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function toOrderDto(order: OrderRecord): OrderDto {
  const { userId: _userId, quoteId: _quoteId, settleAt: _settleAt, outcome: _outcome, ...dto } = order
  return dto
}

/** Deterministic fake transaction hash derived from the order id. */
function transactionHash(orderId: string): string {
  const parts = [0, 1, 2, 3, 4].map((salt) => payloadFingerprint({ orderId, salt }))
  return `0x${parts.join('').slice(0, 64)}`
}

function groupByNft(items: readonly { nftId: string; editionId: string; quantity: number }[], sign: 1 | -1) {
  const patches = new Map<string, EditionPatch[]>()
  for (const item of items) {
    const list = patches.get(item.nftId) ?? []
    list.push({ editionId: item.editionId, availableDelta: sign * item.quantity })
    patches.set(item.nftId, list)
  }
  return patches
}

export function findIdempotentOrder(userId: string, key: string) {
  const db = getDb()
  const record = db.idempotency.find((item) => item.userId === userId && item.key === key)
  if (!record) return null
  const order = db.orders.find((item) => item.id === record.orderId)
  return order ? { record, order } : null
}

export function requestFingerprint(body: CreateOrderRequest): string {
  return payloadFingerprint(body)
}

/** Creates a pending order from a validated quote and reserves the stock. */
export function createOrder(input: {
  userId: string
  idempotencyKey: string
  body: CreateOrderRequest
  quote: QuoteRecord
  wallet: WalletRecord
}): OrderRecord {
  const { userId, idempotencyKey, body, quote, wallet } = input
  const now = new Date()
  const items = quote.lines
    .filter((line) => line.effectiveQuantity > 0)
    .map((line) => {
      const nft = requireNft(line.nftId)
      const edition = findEdition(nft, line.editionId)
      return {
        nftId: line.nftId,
        editionId: line.editionId,
        name: nft.name,
        editionLabel: edition?.label ?? '',
        creatorName: nft.creator.name,
        image: nft.image,
        quantity: line.effectiveQuantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      }
    })

  const config = behavior()
  const order: OrderRecord = {
    id: nextId('order'),
    userId,
    status: 'pending',
    version: 1,
    network: body.network,
    quoteId: quote.quoteId,
    wallet: { id: wallet.id, label: wallet.label, address: wallet.address },
    collector: body.collector,
    items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    couponCode: quote.appliedCoupon,
    transaction: null,
    declineReason: null,
    settleAt: new Date(now.getTime() + config.settlementDelayMs).toISOString(),
    outcome: config.paymentOutcome,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  mutate((db) => {
    db.orders.push(order)
    db.idempotency.push({ key: idempotencyKey, userId, fingerprint: requestFingerprint(body), orderId: order.id })
  })
  for (const [nftId, patches] of groupByNft(items, -1)) updateNft(nftId, patches)
  scheduleSettlement(order)
  return order
}

function publishOrder(order: OrderRecord): void {
  publish(
    buildEvent<OrderUpdatedEvent>({
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: order.version,
      userId: order.userId,
      data: { status: order.status, declineReason: order.declineReason },
    }),
  )
}

/** Moves a pending order to its terminal state. Terminal orders never change again. */
export function settleOrder(orderId: string, outcome?: 'confirmed' | 'declined'): OrderRecord | null {
  timers.delete(orderId)
  const settled = mutate((db) => {
    const order = db.orders.find((item) => item.id === orderId)
    if (!order || isTerminal(order.status)) return null
    const result = outcome ?? order.outcome
    order.status = result
    order.version += 1
    order.updatedAt = new Date().toISOString()
    if (result === 'confirmed') {
      const hash = transactionHash(order.id)
      order.transaction = { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}` }
    } else {
      order.declineReason = 'Pagamento recusado pela carteira.'
    }
    return structuredClone(order)
  })
  if (!settled) return null

  if (settled.status === 'confirmed') {
    const cart = getDb().carts.find((item) => item.userId === settled.userId)
    if (cart) {
      touchCart(cart.id, (draft) => {
        draft.items = subtractPurchased(draft.items, settled.items)
        if (draft.items.length === 0) draft.couponCode = null
      })
    }
  } else {
    for (const [nftId, patches] of groupByNft(settled.items, 1)) updateNft(nftId, patches)
  }
  publishOrder(settled)
  return settled
}

export function scheduleSettlement(order: OrderRecord): void {
  if (isTerminal(order.status) || timers.has(order.id)) return
  const wait = Math.max(Date.parse(order.settleAt) - Date.now(), 0)
  timers.set(
    order.id,
    setTimeout(() => settleOrder(order.id), wait),
  )
}

/** Settles orders whose time has come (e.g. after a reload lost the timer). */
export function settleDueOrders(userId?: string): void {
  for (const order of getDb().orders) {
    if (userId && order.userId !== userId) continue
    if (order.status === 'pending' && Date.parse(order.settleAt) <= Date.now()) settleOrder(order.id)
  }
}

/** Re-arms timers for pending orders after the page (and the mock) reloads. */
export function resumePendingOrders(): void {
  for (const order of getDb().orders) scheduleSettlement(order)
}

export function cancelAllTimers(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
