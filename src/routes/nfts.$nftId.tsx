import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  return (
    <main id="main">
      <h1>{nftId}</h1>
    </main>
  )
}
