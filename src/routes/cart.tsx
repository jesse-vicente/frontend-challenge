import { createFileRoute } from '@tanstack/react-router'
import { CartView } from '@/features/cart/components/cart-view'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [{ title: 'Carrinho | Kurio' }, { name: 'robots', content: 'noindex' }],
  }),
  component: CartView,
})
