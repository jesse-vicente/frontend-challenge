import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido | NFT Marketplace' }] }),
  component: OrderPage,
})

function OrderPage() {
  return (
    <main id="main">
      <h1>Pedido</h1>
    </main>
  )
}
