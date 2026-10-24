import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { announce } from '@/shared/a11y/announcer'
import { apiRequest } from '@/shared/api/client'
import {
  type UpsertWalletRequest,
  type WalletDto,
  type WalletProvider,
  walletConnectionSchema,
  walletSchema,
} from '@/shared/api/dtos/wallet'
import { type CacheOwner, queryKeys } from '@/shared/api/query-keys'
import { useCacheOwner } from '@/shared/session/cache-owner'

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export const walletsQuery = (owner: CacheOwner) =>
  queryOptions({
    queryKey: queryKeys.private.wallets(owner),
    queryFn: ({ signal }) => apiRequest(z.array(walletSchema), { url: '/me/wallets', signal }),
    staleTime: 5 * 60_000,
  })

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  return useMutation({
    mutationFn: ({ id, ...body }: UpsertWalletRequest & { id?: string }) =>
      apiRequest(
        walletSchema,
        id
          ? { method: 'PATCH', url: `/me/wallets/${id}`, data: body }
          : { method: 'POST', url: '/me/wallets', data: body },
      ),
    onSuccess: (wallet) => {
      queryClient.setQueryData<WalletDto[]>(queryKeys.private.wallets(owner), (wallets = []) => {
        const exists = wallets.some((item) => item.id === wallet.id)
        return exists ? wallets.map((item) => (item.id === wallet.id ? wallet : item)) : [...wallets, wallet]
      })
      announce('Carteira salva.')
    },
  })
}

/** Simulated wallet handshake: the provider may approve or reject the connection. */
export function useConnectWallet() {
  return useMutation({
    mutationFn: ({ walletId, provider }: { walletId: string; provider: WalletProvider }) =>
      apiRequest(walletConnectionSchema, {
        method: 'POST',
        url: `/me/wallets/${walletId}/connect`,
        data: { provider },
      }),
  })
}

export function walletDisplayName(wallet: Pick<WalletDto, 'ensName' | 'address'>): string {
  return wallet.ensName || `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
}
