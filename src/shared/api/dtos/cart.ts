import { z } from 'zod'
import { ethAmountSchema, idSchema, imageSchema, isoDateTimeSchema } from './common'

export const cartItemSchema = z.object({
  id: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  quantity: z.int().min(1),
  /** Current catalog price; the quote is the reference for checkout. */
  unitPrice: ethAmountSchema,
  available: z.int().min(0),
  maxPerOrder: z.int().min(1),
  name: z.string(),
  editionLabel: z.string(),
  creatorName: z.string(),
  image: imageSchema,
  addedAt: isoDateTimeSchema,
})
export type CartItemDto = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: idSchema,
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  version: z.int().min(0),
  updatedAt: isoDateTimeSchema,
})
export type CartDto = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  quantity: z.int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({
  quantity: z.int().min(1),
})
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

export const applyCouponRequestSchema = z.object({
  code: z.string().trim().min(1).max(32),
})
export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>
