import { z } from 'zod'
import { ethAmountSchema } from '@/shared/api/dtos/common'
import { nftAvailabilityFilterSchema, nftCategorySchema, nftSortSchema } from '@/shared/api/dtos/nft'

/**
 * Catalog state that lives in the URL. Every field tolerates bad input
 * (`.catch`), so a hand-edited or outdated link still renders the catalog.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  categories: z.array(nftCategorySchema).optional().catch(undefined),
  availability: nftAvailabilityFilterSchema.optional().catch(undefined),
  priceMin: ethAmountSchema.optional().catch(undefined),
  priceMax: ethAmountSchema.optional().catch(undefined),
  sort: nftSortSchema.optional().catch(undefined),
  page: z.int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>
