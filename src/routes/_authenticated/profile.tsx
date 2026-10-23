import { createFileRoute } from '@tanstack/react-router'
import { ProfileView } from '@/features/profile/components/profile-view'

export const Route = createFileRoute('/_authenticated/profile')({
  head: () => ({
    meta: [{ title: 'Meu perfil | Kurio' }, { name: 'robots', content: 'noindex' }],
  }),
  component: ProfileView,
})
