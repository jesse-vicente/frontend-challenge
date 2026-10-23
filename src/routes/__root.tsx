import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router'
import { type RouterContext } from '@/app/router'
import { LiveRegion } from '@/shared/components/live-region'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { title: 'NFT Marketplace' },
      { name: 'description', content: 'Descubra, colecione e compre NFTs exclusivos de artistas digitais.' },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
      <LiveRegion />
    </>
  )
}

function NotFound() {
  return (
    <main id="main">
      <h1>Página não encontrada</h1>
    </main>
  )
}
