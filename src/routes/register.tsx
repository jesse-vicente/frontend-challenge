import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { redirectSearchSchema } from '@/features/auth/redirect'
import { sessionStore } from '@/shared/session/session-store'

export const Route = createFileRoute('/register')({
  validateSearch: redirectSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.getToken()) throw redirect({ to: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Criar conta | Kurio' }, { name: 'robots', content: 'noindex' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthScreen mode="register" redirect={target} />
}
