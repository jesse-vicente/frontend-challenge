import { z } from 'zod'
import { type OrderStatus } from '@/domain/order'
import { ethAmountSchema, idSchema, imageSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './network'
import { quoteSchema } from './quote'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'] as const satisfies readonly OrderStatus[])

export const collectorSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  email: z.email(),
  country: z.string().trim().min(2).max(56),
})
export type CollectorDto = z.infer<typeof collectorSchema>

export const createOrderRequestSchema = z.object({
  quoteId: idSchema,
  walletId: idSchema,
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
  wallet: z.object({ id: idSchema, label: z.string(), address: z.string() }),
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
