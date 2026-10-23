import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  return (
    <main id="main">
      <h1>NFT Marketplace</h1>
    </main>
  )
}
