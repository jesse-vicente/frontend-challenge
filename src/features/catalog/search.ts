import { z } from 'zod'
import { ethAmountSchema } from '@/shared/api/dtos/common'
import { networkSchema } from '@/shared/api/dtos/network'
import { type NftListParams, nftCategorySchema, nftSegmentSchema, nftSortSchema } from '@/shared/api/dtos/nft'

/**
 * Catalog state that lives in the URL. Every field tolerates bad input
 * (`.catch`), so a hand-edited or outdated link still renders the catalog.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  segment: nftSegmentSchema.optional().catch(undefined),
  categories: z.array(nftCategorySchema).optional().catch(undefined),
  networks: z.array(networkSchema).optional().catch(undefined),
  priceMin: ethAmountSchema.optional().catch(undefined),
  priceMax: ethAmountSchema.optional().catch(undefined),
  sort: nftSortSchema.optional().catch(undefined),
  page: z.int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Maps the URL state to API params; empty values are dropped so cache keys stay canonical. */
export function toListParams(search: CatalogSearch): NftListParams {
  return {
    ...(search.q ? { q: search.q } : {}),
    ...(search.segment && search.segment !== 'all' ? { segment: search.segment } : {}),
    ...(search.categories?.length ? { categories: [...search.categories].sort() } : {}),
    ...(search.networks?.length ? { networks: [...search.networks].sort() } : {}),
    ...(search.priceMin ? { priceMin: search.priceMin } : {}),
    ...(search.priceMax ? { priceMax: search.priceMax } : {}),
    ...(search.sort && search.sort !== 'newest' ? { sort: search.sort } : {}),
    page: search.page ?? 1,
  }
}
