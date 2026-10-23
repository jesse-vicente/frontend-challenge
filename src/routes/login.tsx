import { createFileRoute } from '@tanstack/react-router'
import { redirectSearchSchema } from '@/features/auth/redirect'

export const Route = createFileRoute('/login')({
  validateSearch: redirectSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar | NFT Marketplace' }] }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <main id="main">
      <h1>Entrar</h1>
    </main>
  )
}
