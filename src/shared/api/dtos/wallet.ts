import { z } from 'zod'
import { REFERRAL_CODE_PATTERN, USERNAME_PATTERN } from '@/domain/account'
import { isEvmAddress, type WalletRole } from '@/domain/wallet'
import { idSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './network'
import { ensNameSchema } from './profile'

export const walletRoleSchema = z.enum(['primary', 'secondary'] as const satisfies readonly WalletRole[])
export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const evmAddressSchema = z.string().trim().refine(isEvmAddress, { message: 'Invalid wallet address' })

/** Fields of the "Carteira principal/secundária" form, also used as collector data at checkout. */
export const walletFieldsSchema = z.object({
  label: z.string().trim().min(2).max(32),
  displayName: z.string().trim().min(2).max(40),
  profileName: z.string().trim().regex(USERNAME_PATTERN),
  network: networkSchema,
  address: evmAddressSchema,
  secondaryAddress: z.string().trim().max(64).nullable(),
  provider: walletProviderSchema,
  referralCode: z.string().trim().regex(REFERRAL_CODE_PATTERN),
  email: z.email(),
  ensName: ensNameSchema,
})

export const walletSchema = walletFieldsSchema.extend({
  id: idSchema,
  role: walletRoleSchema,
  updatedAt: isoDateTimeSchema,
})
export type WalletDto = z.infer<typeof walletSchema>

export const upsertWalletRequestSchema = walletFieldsSchema.extend({ role: walletRoleSchema })
export type UpsertWalletRequest = z.infer<typeof upsertWalletRequestSchema>

export const connectWalletRequestSchema = z.object({ provider: walletProviderSchema })
export type ConnectWalletRequest = z.infer<typeof connectWalletRequestSchema>

export const walletConnectionSchema = z.object({
  walletId: idSchema,
  provider: walletProviderSchema,
  status: z.enum(['connected', 'rejected']),
  connectedAt: isoDateTimeSchema.nullable(),
})
export type WalletConnectionDto = z.infer<typeof walletConnectionSchema>
