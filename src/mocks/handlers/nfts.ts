import { HttpResponse, http } from 'msw'
import { compare, max, min } from '@/domain/money'
import {
  DEFAULT_PAGE_SIZE,
  type FacetCounts,
  type NftListParams,
  type NftListResponse,
  nftListParamsSchema,
} from '@/shared/api/dtos/nft'
import { getDb } from '../db/store'
import { type NftRecord } from '../db/types'
import { apiPath, route, validationError } from '../http/respond'
import { behavior } from '../scenarios/runtime'
import { requireNft, toDetail, toSummary } from '../services/catalog'

function parseParams(url: URL): NftListParams {
  const optional = (key: string) => url.searchParams.get(key) ?? undefined
  const raw = {
    q: optional('q'),
    segment: optional('segment'),
    categories: url.searchParams.getAll('categories'),
    networks: url.searchParams.getAll('networks'),
    availability: optional('availability'),
    priceMin: optional('priceMin'),
    priceMax: optional('priceMax'),
    sort: optional('sort'),
    collectionId: optional('collectionId'),
    excludeId: optional('excludeId'),
    page: url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined,
    pageSize: url.searchParams.has('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined,
  }
  const parsed = nftListParamsSchema.safeParse(raw)
  if (!parsed.success) {
    throw validationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])))
  }
  return parsed.data
}

function matchesQuery(nft: NftRecord, query: string): boolean {
  const needle = query.toLocaleLowerCase('pt-BR')
  return [nft.name, nft.creator.name, nft.collection.name, ...nft.attributes].some((value) =>
    value.toLocaleLowerCase('pt-BR').includes(needle),
  )
}

const sorters = {
  newest: (a: NftRecord, b: NftRecord) => Date.parse(b.mintedAt) - Date.parse(a.mintedAt),
  'price-asc': (a: NftRecord, b: NftRecord) => compare(a.price, b.price) || a.id.localeCompare(b.id),
  'price-desc': (a: NftRecord, b: NftRecord) => compare(b.price, a.price) || a.id.localeCompare(b.id),
  'name-asc': (a: NftRecord, b: NftRecord) => a.name.localeCompare(b.name, 'pt-BR'),
  trending: (a: NftRecord, b: NftRecord) => b.trendingScore - a.trendingScore || a.id.localeCompare(b.id),
} as const

type Facet = 'categories' | 'networks'

/** Applies every filter except `skip`, so facet counts reflect the other active filters. */
function applyFilters(nfts: readonly NftRecord[], params: NftListParams, skip?: Facet): NftRecord[] {
  const { q, segment, categories, networks, availability, priceMin, priceMax, collectionId, excludeId } = params
  return nfts.filter(
    (nft) =>
      (!q || matchesQuery(nft, q)) &&
      (segment !== 'new' || nft.isNew) &&
      (skip === 'categories' || !categories?.length || categories.includes(nft.category)) &&
      (skip === 'networks' || !networks?.length || networks.includes(nft.network)) &&
      (availability !== 'available' || nft.available > 0) &&
      (availability !== 'sold-out' || nft.available === 0) &&
      (!priceMin || compare(nft.price, priceMin) >= 0) &&
      (!priceMax || compare(nft.price, priceMax) <= 0) &&
      (!collectionId || nft.collection.id === collectionId) &&
      (!excludeId || nft.id !== excludeId),
  )
}

function countBy<K extends string>(nfts: readonly NftRecord[], key: (nft: NftRecord) => K): Partial<Record<K, number>> {
  const counts: Partial<Record<K, number>> = {}
  for (const nft of nfts) counts[key(nft)] = (counts[key(nft)] ?? 0) + 1
  return counts
}

function facetsFor(nfts: readonly NftRecord[], params: NftListParams): FacetCounts {
  const prices = nfts.map((nft) => nft.price)
  const first = prices[0] ?? '0'
  return {
    categories: countBy(applyFilters(nfts, params, 'categories'), (nft) => nft.category),
    networks: countBy(applyFilters(nfts, params, 'networks'), (nft) => nft.network),
    priceRange: { min: prices.reduce(min, first), max: prices.reduce(max, first) },
  }
}

export function queryCatalog(nfts: readonly NftRecord[], params: NftListParams): NftListResponse {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const sort = params.segment === 'trending' && !params.sort ? 'trending' : (params.sort ?? 'newest')
  const filtered = applyFilters(nfts, params).sort(sorters[sort])

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    page,
    pageSize,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
    facets: facetsFor(nfts, params),
  }
}

export const nftHandlers = [
  http.get(
    apiPath('/nfts'),
    route(({ request }) => {
      const params = parseParams(new URL(request.url))
      const source = behavior().emptyCatalog ? [] : getDb().nfts
      return HttpResponse.json(queryCatalog(source, params))
    }),
  ),

  http.get(
    apiPath('/nfts/highlights'),
    route(() => {
      if (behavior().emptyCatalog) return HttpResponse.json({ featured: null, items: [] })
      const available = getDb().nfts.filter((nft) => nft.available > 0)
      const trending = [...available].sort(sorters.trending)
      // "NFT em destaque / oferta limitada": the top trending NFT still on sale.
      const featured = trending[0] ?? null
      const items = trending.slice(0, 6).map(toSummary)
      return HttpResponse.json({ featured: featured ? toSummary(featured) : null, items })
    }),
  ),

  http.get<{ nftId: string }>(
    apiPath('/nfts/:nftId'),
    route<{ nftId: string }>(({ params }) => HttpResponse.json(toDetail(requireNft(params.nftId)))),
  ),
]
