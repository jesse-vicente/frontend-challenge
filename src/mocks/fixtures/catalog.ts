import { percentOf } from '@/domain/money'
import { availabilityOf } from '@/domain/nft'
import { type Network } from '@/shared/api/dtos/network'
import { type NftCategory } from '@/shared/api/dtos/nft'
import { type NftRecord } from '../db/types'
import { createRandom, type Random } from '../lib/random'

export const SEED_EPOCH = Date.parse('2026-01-15T12:00:00.000Z')

/** The four artworks of the Figma file, served as optimized WebP (see scripts/optimize-images.mjs). */
export const ARTWORK_COUNT = 4
export const artworkUrl = (artwork: number) => `/images/nfts/nft-0${artwork + 1}.webp`

interface Family {
  collection: { id: string; name: string }
  names: readonly string[]
  attributes: readonly string[]
  creator: { id: string; name: string }
}

/** One family per artwork: names, collection and traits follow the layout copy. */
const FAMILIES: readonly Family[] = [
  {
    collection: { id: 'kurio-apes', name: 'Kurio Apes' },
    names: ['Emerald Ape', 'Jade Ape', 'Verdant Ape', 'Mint Ape'],
    attributes: ['Óculos', 'Esmeralda', 'Jaqueta'],
    creator: { id: 'creator_nova', name: 'Nova Sato' },
  },
  {
    collection: { id: 'baron-society', name: 'Baron Society' },
    names: ['Neon Vessel', 'Ivory Baron', 'Onyx Baron', 'Velvet Vessel'],
    attributes: ['Gola alta', 'Marfim', 'Clássico'],
    creator: { id: 'creator_ravi', name: 'Ravi Moreau' },
  },
  {
    collection: { id: 'nomad-bloom', name: 'Nomad Bloom' },
    names: ['Sage Nomad', 'Violet Nomad', 'Cosmic Bloom', 'Lilac Nomad'],
    attributes: ['Chapéu', 'Violeta', 'Moletom'],
    creator: { id: 'creator_iris', name: 'Íris Kato' },
  },
  {
    collection: { id: 'golden-frequencies', name: 'Golden Frequencies' },
    names: ['Golden Beat', 'Golden Signal', 'Amber Groove', 'Honey Rhythm'],
    attributes: ['Fones', 'Dourado', 'Sonoro'],
    creator: { id: 'creator_teo', name: 'Téo Andrade' },
  },
]

const CATEGORIES: readonly NftCategory[] = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
]
const NETWORKS: readonly Network[] = ['ethereum', 'ethereum', 'polygon', 'solana']
const RARITY = ['Comum', 'Raro', 'Épico', 'Lendário'] as const

const NETWORK_LABELS: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

/** Edition tiers shown as chips on the detail page; "1/50" is the default edition. */
const EDITION_TIERS = [
  { suffix: '1-1', label: '1/1', multiplier: '600', supply: 1, maxPerOrder: 1 },
  { suffix: '1-10', label: '1/10', multiplier: '200', supply: 10, maxPerOrder: 2 },
  { suffix: '1-50', label: '1/50', multiplier: '100', supply: 50, maxPerOrder: 5 },
  { suffix: 'open', label: 'Aberta', multiplier: '35', supply: 1000, maxPerOrder: 10 },
] as const
const DEFAULT_TIER = '1-50'

/** First page in "newest" order reproduces the product grid of the Figma home. */
const FIGMA_GRID = [
  { family: 0, name: 'Emerald Ape', number: 42, price: '1.19', compareAt: null },
  { family: 2, name: 'Sage Nomad', number: 9, price: '1.69', compareAt: null },
  { family: 1, name: 'Neon Vessel', number: 552, price: '1.99', compareAt: '2.29' },
  { family: 2, name: 'Cosmic Bloom', number: 118, price: '1.29', compareAt: null },
  { family: 2, name: 'Violet Nomad', number: 314, price: '1.39', compareAt: null },
  { family: 1, name: 'Ivory Baron', number: 88, price: '1.79', compareAt: null },
  { family: 3, name: 'Golden Beat', number: 207, price: '0.99', compareAt: null },
  { family: 3, name: 'Amber Groove', number: 73, price: '0.59', compareAt: null },
  { family: 3, name: 'Golden Signal', number: 160, price: '0.39', compareAt: null },
] as const

const REVIEWERS = ['Marina C.', 'João P.', 'Lia M.', 'Caio R.', 'Bruna S.', 'Davi L.', 'Helena T.', 'Rafael N.']
const REVIEW_COMMENTS = [
  'Arte impecável, os detalhes em alta resolução impressionam.',
  'Compra tranquila e a procedência ficou registrada na hora.',
  'Uma das minhas peças favoritas da coleção.',
  'Ótimo custo-benefício para uma edição limitada.',
  'O acesso para colecionadores vale muito a pena.',
  'Cores lindas, combina com o restante do meu acervo.',
]

export const NFT_COUNT = 72

function buildEditions(id: string, basePrice: string, compareAt: string | null, random: Random) {
  const tiers = random.chance(0.25) ? EDITION_TIERS.slice(1, 3) : EDITION_TIERS
  return tiers.map((tier) => ({
    id: `${id}_${tier.suffix}`,
    label: tier.label,
    price: percentOf(basePrice, tier.multiplier),
    compareAtPrice: compareAt && tier.suffix === DEFAULT_TIER ? compareAt : null,
    supply: tier.supply,
    available: random.chance(0.12) ? 0 : random.int(1, tier.supply),
    maxPerOrder: tier.maxPerOrder,
  }))
}

function buildReviews(id: string, random: Random, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${id}_review_${index + 1}`,
    author: random.pick(REVIEWERS),
    rating: random.chance(0.8) ? 5 : 4,
    comment: random.pick(REVIEW_COMMENTS),
    createdAt: new Date(SEED_EPOCH - (index + 1) * 26 * 60 * 60 * 1000).toISOString(),
  }))
}

/** Builds the catalog deterministically: the same seed always yields the same NFTs. */
export function buildCatalog(seed = 2026): NftRecord[] {
  const random = createRandom(seed)
  const nfts: NftRecord[] = []

  for (let index = 0; index < NFT_COUNT; index++) {
    const grid = FIGMA_GRID[index]
    const familyIndex = grid?.family ?? random.int(0, ARTWORK_COUNT - 1)
    const family = FAMILIES[familyIndex] ?? FAMILIES[0]
    if (!family) throw new Error('Missing artwork family')

    const number = grid?.number ?? random.int(1, 999)
    const name = `${grid?.name ?? random.pick(family.names)} #${String(number).padStart(3, '0')}`
    const id = `nft_${String(index + 1).padStart(3, '0')}`
    const basePrice = grid?.price ?? (random.int(30, 4990) / 1000).toFixed(3)
    const compareAt = grid ? grid.compareAt : random.chance(0.15) ? percentOf(basePrice, '115') : null
    const network = index === 0 ? 'ethereum' : random.pick(NETWORKS)

    const editions = buildEditions(id, basePrice, compareAt, random)
    // A few NFTs are fully sold out to exercise "edition unavailable" states.
    if (index > FIGMA_GRID.length && index % 11 === 5) for (const edition of editions) edition.available = 0
    const defaultEdition = editions.find((edition) => edition.id.endsWith(DEFAULT_TIER)) ?? editions[0]
    if (!defaultEdition) throw new Error('Missing default edition')
    // The Figma grid shows these NFTs as purchasable.
    if (grid && defaultEdition.available === 0) defaultEdition.available = Math.min(3, defaultEdition.supply)

    const available = editions.reduce((total, edition) => total + edition.available, 0)
    const reviews = buildReviews(id, random, index === 0 ? 19 : random.int(2, 14))
    const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    const image = {
      url: artworkUrl(familyIndex),
      alt: `${name}, obra de ${family.creator.name}`,
      width: 800,
      height: 800,
    }
    const royaltyPercent = 5
    const rarity = RARITY[Math.min(Math.floor(Number(basePrice)), RARITY.length - 1)] ?? 'Comum'
    const contractAddress = `0x7a42${(index + 1).toString(16).padStart(32, '0')}19e8`

    nfts.push({
      id,
      name,
      creator: family.creator,
      category: CATEGORIES[index % CATEGORIES.length] ?? 'digital-art',
      network,
      image,
      gallery: [0, 1, 2, 3].map((view) => ({ ...image, alt: `${name}, visualização ${view + 1} de 4` })),
      price: defaultEdition.price,
      compareAtPrice: defaultEdition.compareAtPrice,
      available,
      availability: availabilityOf({ available }),
      version: 1,
      description: `Um colecionável digital finalizado à mão da coleção ${family.collection.name}, verificado na ${NETWORK_LABELS[network]}, com arte desbloqueável e acesso para colecionadores.`,
      details: [
        `${name} é uma obra digital ${defaultEdition.label} finalizada à mão da coleção ${family.collection.name}. Cada atributo fica armazenado nos metadados do token e verificado na ${NETWORK_LABELS[network]}.`,
        `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${family.creator.name} recebe ${royaltyPercent}% de direitos autorais nas vendas secundárias.`,
      ],
      editions,
      defaultEditionId: defaultEdition.id,
      tokenId: `#${String(number).padStart(4, '0')}`,
      collection: family.collection,
      attributes: [...family.attributes.slice(0, 2), rarity],
      royaltyPercent,
      rating: { average: Math.round(average * 10) / 10, count: reviews.length },
      reviews,
      mintedAt: new Date(SEED_EPOCH - index * 36 * 60 * 60 * 1000).toISOString(),
      contractAddress,
      tokenStandard: editions.length > 1 ? 'ERC-1155' : 'ERC-721',
      isNew: index < 18,
      // Sage Nomad #009 leads the trending list: it is the featured NFT of the layout.
      trendingScore: index === 1 ? 1001 : random.int(1, 1000),
    })
  }
  return nfts
}
