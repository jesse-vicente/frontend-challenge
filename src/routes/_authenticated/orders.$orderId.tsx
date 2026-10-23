import { createFileRoute } from '@tanstack/react-router'
import { OrderView } from '@/features/orders/components/order-view'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido | Kurio' }, { name: 'robots', content: 'noindex' }] }),
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  return <OrderView orderId={orderId} />
}
