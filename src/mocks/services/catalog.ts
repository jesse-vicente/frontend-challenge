import { min } from '@/domain/money'
import { availabilityOf } from '@/domain/nft'
import { type NftUpdatedEvent } from '@/shared/api/dtos/events'
import { type NftSummaryDto } from '@/shared/api/dtos/nft'
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
    image: nft.image,
    priceFrom: nft.priceFrom,
    available: nft.available,
    availability: nft.availability,
    version: nft.version,
  }
}

function recomputeDerived(nft: NftRecord): void {
  nft.available = nft.editions.reduce((total, edition) => total + Math.max(edition.available, 0), 0)
  nft.availability = availabilityOf({ available: nft.available })
  nft.priceFrom = nft.editions.reduce((lowest, edition) => min(lowest, edition.price), nft.editions[0]?.price ?? '0')
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
        priceFrom: updated.priceFrom,
        available: updated.available,
        availability: updated.availability,
        editions: updated.editions.map((edition) => ({
          id: edition.id,
          price: edition.price,
          available: edition.available,
        })),
      },
    }),
  )
  return updated
}
