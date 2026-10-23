import { z } from 'zod'
import { type EditionAvailability } from '@/domain/nft'
import { ethAmountSchema, idSchema, imageSchema, isoDateTimeSchema, paginatedSchema } from './common'

export const nftCategorySchema = z.enum([
  'art',
  'collectibles',
  'music',
  'photography',
  'video',
  'utility',
  'sport',
  'virtual-worlds',
])
export type NftCategory = z.infer<typeof nftCategorySchema>

export const availabilitySchema = z.enum([
  'available',
  'low-stock',
  'sold-out',
] as const satisfies readonly EditionAvailability[])

export const creatorSchema = z.object({
  id: idSchema,
  name: z.string(),
  avatarUrl: z.string(),
})
export type CreatorDto = z.infer<typeof creatorSchema>

export const editionSchema = z.object({
  id: idSchema,
  label: z.string(),
  price: ethAmountSchema,
  supply: z.int().min(1),
  available: z.int().min(0),
  maxPerOrder: z.int().min(1),
})
export type EditionDto = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  creator: creatorSchema,
  category: nftCategorySchema,
  image: imageSchema,
  /** Lowest edition price. */
  priceFrom: ethAmountSchema,
  available: z.int().min(0),
  availability: availabilitySchema,
  version: z.int().min(0),
})
export type NftSummaryDto = z.infer<typeof nftSummarySchema>

export const nftListResponseSchema = paginatedSchema(nftSummarySchema)
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const nftHighlightsSchema = z.object({ items: z.array(nftSummarySchema) })
export type NftHighlightsDto = z.infer<typeof nftHighlightsSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  gallery: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  tags: z.array(z.string()),
  mintedAt: isoDateTimeSchema,
  contractAddress: z.string(),
  tokenStandard: z.string(),
})
export type NftDetailDto = z.infer<typeof nftDetailSchema>

export const nftSortSchema = z.enum(['newest', 'price-asc', 'price-desc', 'name-asc'])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftAvailabilityFilterSchema = z.enum(['all', 'available', 'sold-out'])
export type NftAvailabilityFilter = z.infer<typeof nftAvailabilityFilterSchema>

/** Query params accepted by GET /nfts. Shared by the URL search schema and the API. */
export const nftListParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  categories: z.array(nftCategorySchema).optional(),
  availability: nftAvailabilityFilterSchema.optional(),
  priceMin: ethAmountSchema.optional(),
  priceMax: ethAmountSchema.optional(),
  sort: nftSortSchema.optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>

export const DEFAULT_PAGE_SIZE = 12
