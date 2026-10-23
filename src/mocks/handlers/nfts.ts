import { HttpResponse, http } from 'msw'
import { compare } from '@/domain/money'
import { DEFAULT_PAGE_SIZE, type NftListParams, type NftListResponse, nftListParamsSchema } from '@/shared/api/dtos/nft'
import { getDb } from '../db/store'
import { type NftRecord } from '../db/types'
import { apiPath, route, validationError } from '../http/respond'
import { behavior } from '../scenarios/runtime'
import { requireNft, toSummary } from '../services/catalog'

function parseParams(url: URL): NftListParams {
  const raw = {
    q: url.searchParams.get('q') ?? undefined,
    categories: url.searchParams.getAll('categories'),
    availability: url.searchParams.get('availability') ?? undefined,
    priceMin: url.searchParams.get('priceMin') ?? undefined,
    priceMax: url.searchParams.get('priceMax') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
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
  return [nft.name, nft.creator.name, ...nft.tags].some((value) => value.toLocaleLowerCase('pt-BR').includes(needle))
}

const sorters = {
  newest: (a: NftRecord, b: NftRecord) => Date.parse(b.mintedAt) - Date.parse(a.mintedAt),
  'price-asc': (a: NftRecord, b: NftRecord) => compare(a.priceFrom, b.priceFrom) || a.id.localeCompare(b.id),
  'price-desc': (a: NftRecord, b: NftRecord) => compare(b.priceFrom, a.priceFrom) || a.id.localeCompare(b.id),
  'name-asc': (a: NftRecord, b: NftRecord) => a.name.localeCompare(b.name, 'pt-BR'),
} as const

export function queryCatalog(nfts: readonly NftRecord[], params: NftListParams): NftListResponse {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const { q, categories, availability, priceMin, priceMax } = params

  const filtered = nfts
    .filter((nft) => !q || matchesQuery(nft, q))
    .filter((nft) => !categories?.length || categories.includes(nft.category))
    .filter((nft) => {
      if (availability === 'available') return nft.available > 0
      if (availability === 'sold-out') return nft.available === 0
      return true
    })
    .filter((nft) => !priceMin || compare(nft.priceFrom, priceMin) >= 0)
    .filter((nft) => !priceMax || compare(nft.priceFrom, priceMax) <= 0)
    .sort(sorters[params.sort ?? 'newest'])

  const totalPages = Math.ceil(filtered.length / pageSize)
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    page,
    pageSize,
    total: filtered.length,
    totalPages,
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
      const items = behavior().emptyCatalog
        ? []
        : getDb()
            .nfts.filter((nft) => nft.available > 0)
            .sort(sorters.newest)
            .slice(0, 6)
            .map(toSummary)
      return HttpResponse.json({ items })
    }),
  ),

  http.get<{ nftId: string }>(
    apiPath('/nfts/:nftId'),
    route<{ nftId: string }>(({ params }) => HttpResponse.json(requireNft(params.nftId))),
  ),
]
