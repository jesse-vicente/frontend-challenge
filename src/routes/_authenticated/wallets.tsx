import { createFileRoute } from '@tanstack/react-router'
import { WalletsView } from '@/features/wallets/components/wallets-view'

export const Route = createFileRoute('/_authenticated/wallets')({
  head: () => ({
    meta: [{ title: 'Carteiras | Kurio' }, { name: 'robots', content: 'noindex' }],
  }),
  component: WalletsView,
})
