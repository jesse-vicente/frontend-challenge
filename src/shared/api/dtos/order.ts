import { z } from 'zod'
import { REFERRAL_CODE_PATTERN, USERNAME_PATTERN } from '@/domain/account'
import { type OrderStatus } from '@/domain/order'
import { ethAmountSchema, idSchema, imageSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './network'
import { ensNameSchema } from './profile'
import { quoteSchema } from './quote'
import { walletProviderSchema } from './wallet'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'] as const satisfies readonly OrderStatus[])

/** "Perfil do colecionador" data of the payment form, frozen into the order. */
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  username: z.string().trim().regex(USERNAME_PATTERN),
  profileName: z.string().trim().regex(USERNAME_PATTERN),
  email: z.email(),
  referralCode: z.string().trim().regex(REFERRAL_CODE_PATTERN),
  ensName: ensNameSchema,
  secondaryAddress: z.string().trim().max(64).nullable(),
  note: z.string().trim().max(500).nullable(),
})
export type CollectorDto = z.infer<typeof collectorSchema>

export const createOrderRequestSchema = z.object({
  quoteId: idSchema,
  walletId: idSchema,
  provider: walletProviderSchema,
  network: networkSchema,
  collector: collectorSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

/** Immutable snapshot of what was bought; later catalog changes never alter it. */
export const orderItemSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  editionLabel: z.string(),
  creatorName: z.string(),
  image: imageSchema,
  quantity: z.int().min(1),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
})
export type OrderItemDto = z.infer<typeof orderItemSchema>

export const transactionSchema = z.object({
  hash: z.string(),
  explorerUrl: z.url(),
})

export const orderSchema = z.object({
  id: idSchema,
  status: orderStatusSchema,
  version: z.int().min(0),
  network: networkSchema,
  wallet: z.object({ id: idSchema, label: z.string(), address: z.string(), provider: walletProviderSchema }),
  collector: collectorSchema,
  items: z.array(orderItemSchema),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  couponCode: z.string().nullable(),
  transaction: transactionSchema.nullable(),
  declineReason: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type OrderDto = z.infer<typeof orderSchema>

/** Details of a 409 QUOTE_STALE: the fresh quote the user must review again. */
export const quoteStaleDetailsSchema = z.object({ quote: quoteSchema })
