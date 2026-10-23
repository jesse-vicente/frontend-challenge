import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateTimeSchema } from './common'
import { availabilitySchema } from './nft'
import { orderStatusSchema } from './order'

function envelopeSchema<TType extends string, TResource extends string, TData extends z.ZodType>(
  type: TType,
  resourceType: TResource,
  data: TData,
) {
  return z.object({
    eventId: idSchema,
    type: z.literal(type),
    resource: z.object({ type: z.literal(resourceType), id: idSchema }),
    version: z.int().min(0),
    occurredAt: isoDateTimeSchema,
    userId: idSchema.nullable(),
    data,
  })
}

export const nftUpdatedEventSchema = envelopeSchema(
  'nft.updated',
  'nft',
  z.object({
    price: ethAmountSchema,
    compareAtPrice: ethAmountSchema.nullable(),
    available: z.int().min(0),
    availability: availabilitySchema,
    editions: z.array(
      z.object({
        id: idSchema,
        price: ethAmountSchema,
        compareAtPrice: ethAmountSchema.nullable(),
        available: z.int().min(0),
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelopeSchema(
  'order.updated',
  'order',
  z.object({
    status: orderStatusSchema,
    declineReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const
