import { type OrderStatus } from '@/domain/order'
import { type Coupon } from '@/domain/quote'
import { type WalletRole } from '@/domain/wallet'
import { type Network } from '@/shared/api/dtos/network'
import { type NftDetailDto } from '@/shared/api/dtos/nft'
import { type CollectorDto, type OrderItemDto } from '@/shared/api/dtos/order'
import { type QuoteDto } from '@/shared/api/dtos/quote'
import { type WalletProvider } from '@/shared/api/dtos/wallet'

export interface UserRecord {
  id: string
  email: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
  revoked: boolean
}

/** Catalog record: the public detail plus ranking data that never leaves the API. */
export interface NftRecord extends NftDetailDto {
  isNew: boolean
  trendingScore: number
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedAt: string
}

export interface CartRecord {
  id: string
  /** null while the cart belongs to a guest. */
  userId: string | null
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord extends QuoteDto {
  cartId: string
  userId: string | null
}

export interface WalletRecord {
  id: string
  userId: string
  role: WalletRole
  label: string
  provider: WalletProvider
  address: string
  updatedAt: string
}

export interface OrderRecord {
  id: string
  userId: string
  status: OrderStatus
  version: number
  network: Network
  quoteId: string
  wallet: { id: string; label: string; address: string }
  collector: CollectorDto
  items: OrderItemDto[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  couponCode: string | null
  transaction: { hash: string; explorerUrl: string } | null
  declineReason: string | null
  /** When the simulated chain settles the payment (survives reloads). */
  settleAt: string
  /** Outcome decided at creation by the active scenario. */
  outcome: 'confirmed' | 'declined'
  createdAt: string
  updatedAt: string
}

export interface IdempotencyRecord {
  key: string
  userId: string
  fingerprint: string
  orderId: string
}

export interface MockDb {
  schemaVersion: number
  /** Monotonic counter for deterministic ids. */
  seq: number
  /** Monotonic counter for realtime event ids. */
  eventSeq: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  favorites: Record<string, string[]>
  carts: CartRecord[]
  coupons: Coupon[]
  quotes: QuoteRecord[]
  wallets: WalletRecord[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
}
