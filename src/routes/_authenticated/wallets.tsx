import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/wallets')({
  head: () => ({ meta: [{ title: 'Carteiras | NFT Marketplace' }] }),
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <main id="main">
      <h1>Carteiras</h1>
    </main>
  )
}
