import { min, percentOf } from '@/domain/money'
import { availabilityOf } from '@/domain/nft'
import { type NftCategory } from '@/shared/api/dtos/nft'
import { type NftRecord } from '../db/types'
import { createRandom } from '../lib/random'

export const SEED_EPOCH = Date.parse('2026-01-15T12:00:00.000Z')

export const NFT_IMAGE_COUNT = 16
export const AVATAR_IMAGE_COUNT = 12

export const nftImageUrl = (index: number) =>
  `/images/nfts/nft-${String((index % NFT_IMAGE_COUNT) + 1).padStart(2, '0')}.webp`
export const avatarImageUrl = (index: number) =>
  `/images/avatars/avatar-${String((index % AVATAR_IMAGE_COUNT) + 1).padStart(2, '0')}.webp`

export const CREATORS = [
  'Animakid',
  'Keepitreal',
  'DigiLab',
  'GravityOne',
  'Juanie',
  'BlueWhale',
  'Mr Fox',
  'Shroomie',
  'Robotica',
  'RustyRobot',
  'Moon Dancer',
  'Orbitian',
].map((name, index) => ({
  id: `creator_${String(index + 1).padStart(2, '0')}`,
  name,
  avatarUrl: avatarImageUrl(index),
}))

const ADJECTIVES = [
  'Distant',
  'Neon',
  'Silent',
  'Cosmic',
  'Golden',
  'Hidden',
  'Electric',
  'Velvet',
  'Crystal',
  'Wild',
  'Lunar',
  'Fading',
]
const NOUNS = [
  'Galaxy',
  'Dreams',
  'Mushroom',
  'Astronaut',
  'Garden',
  'Robot',
  'Horizon',
  'Whale',
  'Bloom',
  'Echo',
  'Portal',
  'Fox',
]
const CATEGORIES: readonly NftCategory[] = [
  'art',
  'collectibles',
  'music',
  'photography',
  'video',
  'utility',
  'sport',
  'virtual-worlds',
]
const TAGS = ['animation', 'abstract', 'pixel', '3d', 'generative', 'portrait', 'landscape', 'sci-fi', 'surreal']

const EDITION_TIERS = [
  { suffix: 'standard', label: 'Edição padrão', multiplier: 1, supply: [20, 50] },
  { suffix: 'rare', label: 'Edição rara', multiplier: 2.5, supply: [5, 12] },
  { suffix: 'legendary', label: 'Edição lendária', multiplier: 6, supply: [1, 3] },
] as const

export const NFT_COUNT = 64

/** Builds the catalog deterministically: the same seed always yields the same NFTs. */
export function buildCatalog(seed = 2026): NftRecord[] {
  const random = createRandom(seed)
  const nfts: NftRecord[] = []

  for (let index = 0; index < NFT_COUNT; index++) {
    const id = `nft_${String(index + 1).padStart(3, '0')}`
    const name = `${ADJECTIVES[index % ADJECTIVES.length]} ${NOUNS[Math.floor(index / ADJECTIVES.length + index) % NOUNS.length]} #${index + 1}`
    const creator = random.pick(CREATORS)
    const category = CATEGORIES[index % CATEGORIES.length] ?? 'art'
    // Prices between 0.05 and 4.99 ETH with up to 3 decimals.
    const basePrice = (random.int(50, 4990) / 1000).toFixed(3)

    const tierCount = random.int(1, EDITION_TIERS.length)
    const editions = EDITION_TIERS.slice(0, tierCount).map((tier) => {
      const supply = random.int(tier.supply[0], tier.supply[1])
      return {
        id: `${id}_${tier.suffix}`,
        label: tier.label,
        price: percentOf(basePrice, String(tier.multiplier * 100)),
        supply,
        available: random.chance(0.15) ? 0 : random.int(1, supply),
        maxPerOrder: Math.min(supply, tier.suffix === 'standard' ? 5 : 2),
      }
    })

    // A few NFTs are fully sold out to exercise "edition unavailable" states.
    if (index % 13 === 7) for (const edition of editions) edition.available = 0

    const available = editions.reduce((total, edition) => total + edition.available, 0)
    const priceFrom = editions.reduce((lowest, edition) => min(lowest, edition.price), editions[0]?.price ?? '0')
    const galleryIndexes = [index, index + 5, index + 9]

    nfts.push({
      id,
      name,
      creator,
      category,
      image: { url: nftImageUrl(index), alt: `${name}, obra de ${creator.name}`, width: 800, height: 800 },
      gallery: galleryIndexes.map((imageIndex, position) => ({
        url: nftImageUrl(imageIndex),
        alt: `${name}, imagem ${position + 1} de ${galleryIndexes.length}`,
        width: 800,
        height: 800,
      })),
      priceFrom,
      available,
      availability: availabilityOf({ available }),
      version: 1,
      description: `${name} faz parte da coleção de ${creator.name}. Uma peça digital única que explora cor, forma e movimento.`,
      editions,
      tags: [random.pick(TAGS), random.pick(TAGS)].filter((tag, position, list) => list.indexOf(tag) === position),
      mintedAt: new Date(SEED_EPOCH - index * 36 * 60 * 60 * 1000).toISOString(),
      contractAddress: `0x${(index + 1).toString(16).padStart(40, 'a')}`,
      tokenStandard: editions.length > 1 ? 'ERC-1155' : 'ERC-721',
    })
  }
  return nfts
}
