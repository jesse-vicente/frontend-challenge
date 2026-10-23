import { createRootRouteWithContext, HeadContent, Link, Outlet } from '@tanstack/react-router'
import { MobileTabBar } from '@/app/layout/mobile-tab-bar'
import { SiteFooter } from '@/app/layout/site-footer'
import { SiteHeader } from '@/app/layout/site-header'
import { type RouterContext } from '@/app/router'
import { useSessionRestore } from '@/features/auth/queries'
import { LiveRegion } from '@/shared/components/live-region'
import { Button } from '@/shared/ui/button'
import { Toaster } from '@/shared/ui/sonner'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { title: 'Kurio | Marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara na Kurio.',
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  useSessionRestore()
  return (
    <TooltipProvider>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <div id="conteudo" tabIndex={-1} className="min-h-dvh outline-none">
        <Outlet />
      </div>
      <SiteFooter />
      <MobileTabBar />
      <Toaster />
      <LiveRegion />
    </TooltipProvider>
  )
}

function NotFound() {
  return (
    <main className="page-container flex min-h-[50vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="text-sm font-bold tracking-[1.4px] text-amber">ERRO 404</p>
      <h1 className="text-3xl font-bold text-foreground md:text-[43px] md:leading-[70px]">PÁGINA NÃO ENCONTRADA</h1>
      <p className="max-w-[557px] text-sm leading-6 text-sand">
        O endereço acessado não existe ou foi removido. Volte ao início para continuar explorando a coleção.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
