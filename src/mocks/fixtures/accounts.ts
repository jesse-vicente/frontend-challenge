import { type Coupon } from '@/domain/quote'
import { type UserRecord, type WalletRecord } from '../db/types'
import { hashPassword } from '../lib/crypto'
import { SEED_EPOCH } from './catalog'

/** Fictitious credentials documented in the README. */
export const DEMO_PASSWORD = 'Senha123'

const seedDate = new Date(SEED_EPOCH).toISOString()

const SEED_USERS = [
  {
    id: 'user_alice',
    email: 'alice@nft.test',
    username: 'alice',
    displayName: 'Alice Martins',
    ensName: 'alice.kurio.eth',
    walletNickname: 'Principal',
    avatarUrl: null,
    passwordSalt: 'f3a1c2d4e5b60718',
  },
  {
    id: 'user_bob',
    email: 'bob@nft.test',
    username: 'bob',
    displayName: 'Bruno Oliveira',
    ensName: null,
    walletNickname: 'Principal',
    avatarUrl: null,
    passwordSalt: '9b8a7c6d5e4f3021',
  },
] as const

export async function buildUsers(): Promise<UserRecord[]> {
  return Promise.all(
    SEED_USERS.map(async (user) => ({
      ...user,
      passwordHash: await hashPassword(DEMO_PASSWORD, user.passwordSalt),
      createdAt: seedDate,
      updatedAt: seedDate,
    })),
  )
}

export function buildWallets(): WalletRecord[] {
  return [
    {
      id: 'wallet_alice_primary',
      userId: 'user_alice',
      role: 'primary',
      label: 'Principal',
      displayName: 'Alice Martins',
      profileName: 'alice',
      network: 'ethereum',
      address: '0xa91f7656ec7ab88b098defb751b7401b5f6de82c',
      secondaryAddress: null,
      provider: 'metamask',
      referralCode: 'KURIO2026',
      email: 'alice@nft.test',
      ensName: 'alice.kurio.eth',
      updatedAt: seedDate,
    },
    {
      id: 'wallet_alice_secondary',
      userId: 'user_alice',
      role: 'secondary',
      label: 'Reserva',
      displayName: 'Alice Martins',
      profileName: 'alice',
      network: 'polygon',
      address: '0x2546bcd3c84621e976d8185a91a922ae77ecec30',
      secondaryAddress: null,
      provider: 'coinbase',
      referralCode: 'KURIO2026',
      email: 'alice@nft.test',
      ensName: 'nova.kurio.eth',
      updatedAt: seedDate,
    },
    {
      id: 'wallet_bob_primary',
      userId: 'user_bob',
      role: 'primary',
      label: 'Principal',
      displayName: 'Bruno Oliveira',
      profileName: 'bob',
      network: 'ethereum',
      address: '0xbda5747bfd65f08deb54cb465eb87d40e51b197e',
      secondaryAddress: null,
      provider: 'walletconnect',
      referralCode: 'BOB2026',
      email: 'bob@nft.test',
      ensName: 'bob.kurio.eth',
      updatedAt: seedDate,
    },
  ]
}

export function buildCoupons(): Coupon[] {
  return [
    { code: 'WELCOME10', kind: 'percent', value: '10', expiresAt: '2030-12-31T23:59:59.000Z' },
    { code: 'NFT5', kind: 'fixed', value: '0.05', expiresAt: '2030-12-31T23:59:59.000Z', minSubtotal: '0.5' },
    { code: 'EXPIRED20', kind: 'percent', value: '20', expiresAt: '2025-01-01T00:00:00.000Z' },
  ]
}

export function buildFavorites(): Record<string, string[]> {
  return { user_alice: ['nft_001', 'nft_011'], user_bob: [] }
}
