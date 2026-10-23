import { createFileRoute } from '@tanstack/react-router'
import { redirectSearchSchema } from '@/features/auth/redirect'

export const Route = createFileRoute('/register')({
  validateSearch: redirectSearchSchema,
  head: () => ({ meta: [{ title: 'Criar conta | NFT Marketplace' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <main id="main">
      <h1>Criar conta</h1>
    </main>
  )
}
