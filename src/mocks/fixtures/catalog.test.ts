import { describe, expect, it } from 'vitest'
import { isEthAmount } from '@/domain/money'
import { nftDetailSchema } from '@/shared/api/dtos/nft'
import { buildCatalog, NFT_COUNT } from './catalog'

describe('catalog fixtures', () => {
  it('is deterministic', () => {
    expect(buildCatalog()).toEqual(buildCatalog())
  })

  it('matches the detail DTO contract', () => {
    for (const nft of buildCatalog()) expect(nftDetailSchema.safeParse(nft).success).toBe(true)
  })

  it('has enough variety for filters and pagination', () => {
    const catalog = buildCatalog()
    expect(catalog).toHaveLength(NFT_COUNT)
    expect(new Set(catalog.map((nft) => nft.id)).size).toBe(NFT_COUNT)
    expect(new Set(catalog.map((nft) => nft.category)).size).toBeGreaterThanOrEqual(8)
    expect(catalog.some((nft) => nft.availability === 'sold-out')).toBe(true)
    expect(catalog.some((nft) => nft.editions.some((edition) => edition.available === 0))).toBe(true)
    expect(catalog.every((nft) => isEthAmount(nft.priceFrom))).toBe(true)
  })
})
