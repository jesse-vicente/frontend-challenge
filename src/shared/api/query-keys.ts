import { type Network } from './dtos/network'
import { type NftListParams } from './dtos/nft'

/**
 * Owner of private data: an authenticated user or a guest cart.
 * Every private key starts with ['private', owner], so logout or user switch
 * clears a whole scope with a single removeQueries call.
 */
export type CacheOwner = `user:${string}` | `guest:${string}`

export const userOwner = (userId: string): CacheOwner => `user:${userId}`
export const guestOwner = (cartId: string): CacheOwner => `guest:${cartId}`

export const queryKeys = {
  session: () => ['session'] as const,

  nfts: {
    all: () => ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    highlights: () => ['nfts', 'highlights'] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
  },

  private: {
    all: (owner: CacheOwner) => ['private', owner] as const,
    cart: (owner: CacheOwner) => ['private', owner, 'cart'] as const,
    quote: (owner: CacheOwner, network: Network) => ['private', owner, 'quote', network] as const,
    favorites: (owner: CacheOwner) => ['private', owner, 'favorites'] as const,
    profile: (owner: CacheOwner) => ['private', owner, 'profile'] as const,
    wallets: (owner: CacheOwner) => ['private', owner, 'wallets'] as const,
    order: (owner: CacheOwner, orderId: string) => ['private', owner, 'orders', orderId] as const,
  },
} as const
