import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { type NftListParams, nftDetailSchema, nftHighlightsSchema, nftListResponseSchema } from '@/shared/api/dtos/nft'
import { queryKeys } from '@/shared/api/query-keys'
import { eventGuard } from '@/shared/realtime/realtime-store'

/** Versions seen through REST become the baseline that stale socket events must beat. */
function observeVersions(items: readonly { id: string; version: number }[]) {
  for (const item of items) eventGuard.observe({ type: 'nft', id: item.id }, item.version)
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: async ({ signal }) => {
      const page = await apiRequest(nftListResponseSchema, { url: '/nfts', params, signal })
      observeVersions(page.items)
      return page
    },
    // Keep the previous page on screen while filters change (no layout jump).
    placeholderData: keepPreviousData,
  })

export const nftHighlightsQuery = () =>
  queryOptions({
    queryKey: queryKeys.nfts.highlights(),
    queryFn: async ({ signal }) => {
      const highlights = await apiRequest(nftHighlightsSchema, { url: '/nfts/highlights', signal })
      observeVersions(highlights.featured ? [highlights.featured, ...highlights.items] : highlights.items)
      return highlights
    },
  })

export const nftDetailQuery = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: async ({ signal }) => {
      const nft = await apiRequest(nftDetailSchema, { url: `/nfts/${encodeURIComponent(nftId)}`, signal })
      observeVersions([nft])
      return nft
    },
  })
