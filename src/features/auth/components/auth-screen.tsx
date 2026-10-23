import { useNavigate } from '@tanstack/react-router'
import { HomePageContent } from '@/features/catalog/components/home-page-content'
import { useIsDesktop } from '@/shared/lib/use-media-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { type AuthMode, AuthPanel } from './auth-panel'

const TITLES: Record<AuthMode, string> = { login: 'Entrar', register: 'Criar conta' }
const noop = () => undefined

/**
 * Desktop: the "Sign In/Up Modal" over the marketplace page (focus trapped in the
 * dialog, page inert behind it). Mobile: the dedicated full-screen frame.
 */
export function AuthScreen({ mode, redirect }: { mode: AuthMode; redirect: string | undefined }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const close = () => void navigate({ to: redirect && !redirect.startsWith('/checkout') ? redirect : '/' })

  if (!isDesktop) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[414px] flex-col gap-12 px-7 pt-28 pb-12">
        <p className="text-center text-[34px] font-bold tracking-[2px] text-foreground">KURIO</p>
        <section aria-labelledby="auth-title" className="flex flex-col gap-8">
          <h1 id="auth-title" className="text-center text-xl font-bold text-foreground">
            {TITLES[mode]}
          </h1>
          <AuthPanel mode={mode} redirect={redirect} layout="page" />
        </section>
      </main>
    )
  }

  return (
    <>
      <HomePageContent search={{}} onSearchChange={noop} />
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          overlayClassName="bg-ink/40"
          className="flex w-[500px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-none border-0 bg-surface p-0 sm:max-w-[500px]"
        >
          <DialogTitle className="sr-only">{TITLES[mode]}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'login' ? 'Acesse sua conta Kurio.' : 'Crie sua conta de colecionador Kurio.'}
          </DialogDescription>
          <div className="px-20 pt-12 pb-10">
            <AuthPanel mode={mode} redirect={redirect} layout="modal" />
          </div>
          <div aria-hidden="true" className="h-2 bg-primary" />
        </DialogContent>
      </Dialog>
    </>
  )
}
