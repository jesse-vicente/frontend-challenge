import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { redirectSearchSchema } from '@/features/auth/redirect'
import { sessionStore } from '@/shared/session/session-store'

export const Route = createFileRoute('/login')({
  validateSearch: redirectSearchSchema,
  // Already signed in: go straight to the requested page.
  beforeLoad: ({ search }) => {
    if (sessionStore.getToken()) throw redirect({ to: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Entrar | Kurio' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthScreen mode="login" redirect={target} />
}
