import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { nftDetailQuery } from '@/features/catalog/queries'
import { NftDetailSkeleton, NftDetailView } from '@/features/nft/components/nft-detail-view'
import { hasErrorCode } from '@/shared/api/errors'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: z.object({ edition: z.string().optional().catch(undefined) }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(nftDetailQuery(params.nftId))
    } catch (error) {
      if (hasErrorCode(error, 'NOT_FOUND')) throw notFound()
      throw error
    }
  },
  // Skeleton as soon as loading is noticeable; cached NFTs render instantly.
  pendingMs: 150,
  pendingComponent: NftDetailSkeleton,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.name} | Kurio` }, { name: 'description', content: loaderData.description }]
      : [{ title: 'NFT | Kurio' }],
  }),
  notFoundComponent: NftNotFound,
  errorComponent: NftLoadError,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const initial = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  // Subscribed to the cache: realtime price/stock updates re-render the page.
  const { data: nft = initial } = useQuery(nftDetailQuery(nftId))

  return (
    <NftDetailView
      nft={nft}
      editionId={edition}
      onSelectEdition={(editionId) =>
        void navigate({ search: { edition: editionId }, replace: true, resetScroll: false })
      }
    />
  )
}

function NftNotFound() {
  return (
    <main className="page-container py-24">
      <EmptyState
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do mercado."
        action={
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar o mercado
            </Link>
          </Button>
        }
      />
    </main>
  )
}

function NftLoadError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <main className="page-container py-24">
      <ErrorState title="Não foi possível carregar o NFT" error={error} onRetry={() => void router.invalidate()} />
    </main>
  )
}
