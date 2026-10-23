import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [{ title: 'Carrinho | NFT Marketplace' }] }),
  component: CartPage,
})

function CartPage() {
  return (
    <main id="main">
      <h1>Carrinho</h1>
    </main>
  )
}
