import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/checkout')({
  head: () => ({ meta: [{ title: 'Pagamento | NFT Marketplace' }] }),
  component: CheckoutPage,
})

function CheckoutPage() {
  return (
    <main id="main">
      <h1>Pagamento</h1>
    </main>
  )
}
