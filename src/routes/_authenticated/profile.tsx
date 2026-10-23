import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/profile')({
  head: () => ({ meta: [{ title: 'Perfil | NFT Marketplace' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <main id="main">
      <h1>Perfil</h1>
    </main>
  )
}
