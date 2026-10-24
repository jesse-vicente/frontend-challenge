import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { HomePageContent } from '@/features/catalog/components/home-page-content'
import { nftHighlightsQuery, nftListQuery } from '@/features/catalog/queries'
import { type CatalogSearch, catalogSearchSchema, toListParams } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListParams(search),
  // Warm the cache without blocking navigation: the page renders skeletons meanwhile.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
    void context.queryClient.prefetchQuery(nftHighlightsQuery())
  },
  head: () => ({
    meta: [
      { title: 'Kurio | Marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Seja dono do futuro da arte digital: descubra, filtre e colecione NFTs de criadores emergentes e consagrados na Kurio.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const onSearchChange = useCallback(
    (patch: Partial<CatalogSearch>, options?: { resetPage?: boolean }) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, ...(options?.resetPage ? { page: undefined } : {}) }),
        // Typing in the search box should not flood the history stack.
        replace: 'q' in patch,
        resetScroll: false,
      })
    },
    [navigate],
  )

  return <HomePageContent search={search} onSearchChange={onSearchChange} />
}
