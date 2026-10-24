import { z } from 'zod'
import { type CouponRejection } from '@/domain/quote'
import { ethAmountSchema, idSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './network'

export const cartLineIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sold-out') }),
  z.object({ kind: z.literal('quantity-reduced'), requested: z.int(), allowed: z.int() }),
  z.object({ kind: z.literal('invalid-quantity') }),
])

export const quoteLineSchema = z.object({
  cartItemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  quantity: z.int().min(1),
  effectiveQuantity: z.int().min(0),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  issue: cartLineIssueSchema.nullable(),
})
export type QuoteLineDto = z.infer<typeof quoteLineSchema>

export const couponRejectionSchema = z.enum([
  'not-found',
  'expired',
  'min-subtotal',
] as const satisfies readonly CouponRejection[])

export const quoteSchema = z.object({
  quoteId: idSchema,
  cartVersion: z.int().min(0),
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  appliedCoupon: z.string().nullable(),
  couponRejection: couponRejectionSchema.nullable(),
  purchasable: z.boolean(),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
})
export type QuoteDto = z.infer<typeof quoteSchema>

export const createQuoteRequestSchema = z.object({
  network: networkSchema,
})
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>
