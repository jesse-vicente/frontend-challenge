import { availabilityOf } from '@/domain/nft'
import { type NftUpdatedEvent } from '@/shared/api/dtos/events'
import { type NftDetailDto, type NftSummaryDto } from '@/shared/api/dtos/nft'
import { getDb, mutate } from '../db/store'
import { type NftRecord } from '../db/types'
import { notFound } from '../http/respond'
import { buildEvent, publish } from '../realtime/publisher'

export function findNft(nftId: string): NftRecord | undefined {
  return getDb().nfts.find((nft) => nft.id === nftId)
}

export function requireNft(nftId: string): NftRecord {
  const nft = findNft(nftId)
  if (!nft) throw notFound('NFT não encontrado.')
  return nft
}

export function findEdition(nft: NftRecord, editionId: string) {
  return nft.editions.find((edition) => edition.id === editionId)
}

export function toSummary(nft: NftRecord): NftSummaryDto {
  return {
    id: nft.id,
    name: nft.name,
    creator: nft.creator,
    category: nft.category,
    network: nft.network,
    rarity: nft.rarity,
    image: nft.image,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    available: nft.available,
    availability: nft.availability,
    version: nft.version,
  }
}

export function toDetail({ isNew: _isNew, trendingScore: _trendingScore, ...detail }: NftRecord): NftDetailDto {
  return detail
}

function recomputeDerived(nft: NftRecord): void {
  nft.available = nft.editions.reduce((total, edition) => total + Math.max(edition.available, 0), 0)
  nft.availability = availabilityOf({ available: nft.available })
  const listed = nft.editions.find((edition) => edition.id === nft.defaultEditionId) ?? nft.editions[0]
  nft.price = listed?.price ?? '0'
  nft.compareAtPrice = listed?.compareAtPrice ?? null
}

export interface EditionPatch {
  editionId: string
  price?: string
  available?: number
  /** Relative stock change, applied after `available`. */
  availableDelta?: number
}

/**
 * Single entry point for catalog changes: bumps the NFT version and publishes
 * `nft.updated`, so REST responses and realtime events never diverge.
 */
export function updateNft(nftId: string, patches: readonly EditionPatch[]): NftRecord {
  const updated = mutate((db) => {
    const nft = db.nfts.find((item) => item.id === nftId)
    if (!nft) throw notFound('NFT não encontrado.')
    for (const patch of patches) {
      const edition = nft.editions.find((item) => item.id === patch.editionId)
      if (!edition) throw notFound('Edição não encontrada.')
      if (patch.price !== undefined) edition.price = patch.price
      if (patch.available !== undefined) edition.available = patch.available
      if (patch.availableDelta !== undefined) edition.available = Math.max(edition.available + patch.availableDelta, 0)
    }
    recomputeDerived(nft)
    nft.version += 1
    return structuredClone(nft)
  })

  publish(
    buildEvent<NftUpdatedEvent>({
      type: 'nft.updated',
      resource: { type: 'nft', id: updated.id },
      version: updated.version,
      userId: null,
      data: {
        price: updated.price,
        compareAtPrice: updated.compareAtPrice,
        available: updated.available,
        availability: updated.availability,
        editions: updated.editions.map((edition) => ({
          id: edition.id,
          price: edition.price,
          compareAtPrice: edition.compareAtPrice,
          available: edition.available,
        })),
      },
    }),
  )
  return updated
}
