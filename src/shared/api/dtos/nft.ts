import { z } from 'zod'
import { type EditionAvailability } from '@/domain/nft'
import { ethAmountSchema, idSchema, imageSchema, isoDateTimeSchema, paginatedSchema } from './common'
import { networkSchema } from './network'

/** Catalog categories (the "Coleções" filter in the layout). */
export const nftCategorySchema = z.enum([
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
])
export type NftCategory = z.infer<typeof nftCategorySchema>

export const availabilitySchema = z.enum([
  'available',
  'low-stock',
  'sold-out',
] as const satisfies readonly EditionAvailability[])

export const raritySchema = z.enum(['common', 'rare', 'epic', 'legendary'])
export type Rarity = z.infer<typeof raritySchema>

export const creatorSchema = z.object({
  id: idSchema,
  name: z.string(),
})
export type CreatorDto = z.infer<typeof creatorSchema>

export const editionSchema = z.object({
  id: idSchema,
  /** Edition size label shown in the chips, e.g. "1/50" or "Aberta". */
  label: z.string(),
  price: ethAmountSchema,
  /** Previous price when the edition is on sale. */
  compareAtPrice: ethAmountSchema.nullable(),
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
  network: networkSchema,
  rarity: raritySchema,
  image: imageSchema,
  /** Listing price: price of the default edition, and its previous price when on sale. */
  price: ethAmountSchema,
  compareAtPrice: ethAmountSchema.nullable(),
  available: z.int().min(0),
  availability: availabilitySchema,
  version: z.int().min(0),
})
export type NftSummaryDto = z.infer<typeof nftSummarySchema>

export const facetCountsSchema = z.object({
  categories: z.partialRecord(nftCategorySchema, z.int().min(0)),
  networks: z.partialRecord(networkSchema, z.int().min(0)),
  /** Price bounds of the whole catalog, used by the price range slider. */
  priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
})
export type FacetCounts = z.infer<typeof facetCountsSchema>

export const nftListResponseSchema = paginatedSchema(nftSummarySchema).extend({ facets: facetCountsSchema })
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const nftHighlightsSchema = z.object({
  featured: nftSummarySchema.nullable(),
  items: z.array(nftSummarySchema),
})
export type NftHighlightsDto = z.infer<typeof nftHighlightsSchema>

export const reviewSchema = z.object({
  id: idSchema,
  author: z.string(),
  rating: z.int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateTimeSchema,
})
export type ReviewDto = z.infer<typeof reviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  /** Long-form text of the "Detalhes do NFT" tab, one entry per paragraph. */
  details: z.array(z.string()),
  gallery: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  /** Edition preselected on the detail page and used for the listing price. */
  defaultEditionId: idSchema,
  tokenId: z.string(),
  collection: z.object({ id: idSchema, name: z.string() }),
  attributes: z.array(z.string()),
  royaltyPercent: z.number().min(0).max(100),
  rating: z.object({ average: z.number().min(0).max(5), count: z.int().min(0) }),
  reviews: z.array(reviewSchema),
  mintedAt: isoDateTimeSchema,
  contractAddress: z.string(),
  tokenStandard: z.string(),
})
export type NftDetailDto = z.infer<typeof nftDetailSchema>

export const nftSortSchema = z.enum(['newest', 'price-asc', 'price-desc', 'name-asc'])
export type NftSort = z.infer<typeof nftSortSchema>

/** Catalog tabs: all NFTs, new releases or trending. */
export const nftSegmentSchema = z.enum(['all', 'new', 'trending'])
export type NftSegment = z.infer<typeof nftSegmentSchema>

export const nftAvailabilityFilterSchema = z.enum(['all', 'available', 'sold-out'])
export type NftAvailabilityFilter = z.infer<typeof nftAvailabilityFilterSchema>

/** Query params accepted by GET /nfts. Shared by the URL search schema and the API. */
export const nftListParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  segment: nftSegmentSchema.optional(),
  categories: z.array(nftCategorySchema).optional(),
  networks: z.array(networkSchema).optional(),
  availability: nftAvailabilityFilterSchema.optional(),
  priceMin: ethAmountSchema.optional(),
  priceMax: ethAmountSchema.optional(),
  sort: nftSortSchema.optional(),
  /** Restricts results to one collection ("Mais desta coleção"). */
  collectionId: idSchema.optional(),
  excludeId: idSchema.optional(),
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>

export const DEFAULT_PAGE_SIZE = 9
