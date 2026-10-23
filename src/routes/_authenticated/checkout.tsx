import { createFileRoute } from '@tanstack/react-router'
import { CheckoutView } from '@/features/checkout/components/checkout-view'

export const Route = createFileRoute('/_authenticated/checkout')({
  head: () => ({ meta: [{ title: 'Pagamento | Kurio' }, { name: 'robots', content: 'noindex' }] }),
  component: CheckoutView,
})
