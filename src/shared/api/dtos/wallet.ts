import { z } from 'zod'
import { isEvmAddress, type WalletRole } from '@/domain/wallet'
import { idSchema, isoDateTimeSchema } from './common'

export const walletRoleSchema = z.enum(['primary', 'secondary'] as const satisfies readonly WalletRole[])
export const walletProviderSchema = z.enum(['metamask', 'coinbase', 'walletconnect'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const evmAddressSchema = z.string().trim().refine(isEvmAddress, { message: 'Invalid wallet address' })

export const walletSchema = z.object({
  id: idSchema,
  role: walletRoleSchema,
  label: z.string(),
  provider: walletProviderSchema,
  address: z.string(),
  updatedAt: isoDateTimeSchema,
})
export type WalletDto = z.infer<typeof walletSchema>

export const upsertWalletRequestSchema = z.object({
  role: walletRoleSchema,
  label: z.string().trim().min(2).max(32),
  provider: walletProviderSchema,
  address: evmAddressSchema,
})
export type UpsertWalletRequest = z.infer<typeof upsertWalletRequestSchema>

export const walletConnectionSchema = z.object({
  walletId: idSchema,
  status: z.enum(['connected', 'rejected']),
  connectedAt: isoDateTimeSchema.nullable(),
})
export type WalletConnectionDto = z.infer<typeof walletConnectionSchema>
