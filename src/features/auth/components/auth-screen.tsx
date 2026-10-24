import { useCanGoBack, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { HomePageContent } from '@/features/catalog/components/home-page-content'
import { useIsDesktop } from '@/shared/lib/use-media-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { withAuthModal, withoutAuthModal } from '../auth-modal'
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
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Back to the page the visitor came from: the redirect target may be a private page,
  // which would send them straight back here.
  const close = () => (canGoBack ? router.history.back() : void navigate({ to: '/' }))

  if (!isDesktop) {
    return (
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[414px] flex-col gap-12 px-7 pt-28 pb-12">
        <button
          type="button"
          onClick={close}
          aria-label="Voltar"
          className="absolute top-6 left-4 grid size-[35px] place-items-center rounded-full bg-surface-dark text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
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

  // Direct link to /login on desktop: the marketplace page behind the modal, as in the layout.
  return (
    <>
      <HomePageContent search={{}} onSearchChange={noop} />
      <AuthDialog mode={mode} redirect={redirect} onClose={close} />
    </>
  )
}

/** The "Sign In/Up Modal" (focus trapped in the dialog, page inert behind it). */
function AuthDialog({
  mode,
  redirect,
  onClose,
  onModeChange,
}: {
  mode: AuthMode
  redirect: string | undefined
  onClose: () => void
  onModeChange?: (mode: AuthMode) => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        overlayClassName="bg-ink/40"
        className="flex max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-y-auto rounded-none border-0 bg-surface p-0 sm:max-w-[500px]"
      >
        <DialogTitle className="sr-only">{TITLES[mode]}</DialogTitle>
        <DialogDescription className="sr-only">
          {mode === 'login' ? 'Acesse sua conta Kurio.' : 'Crie sua conta de colecionador Kurio.'}
        </DialogDescription>
        <div className="px-6 pt-12 pb-10 sm:px-20">
          <AuthPanel mode={mode} redirect={redirect} layout="modal" onModeChange={onModeChange} />
        </div>
        <div aria-hidden="true" className="h-2 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Sign-in modal over the current page (`?auth=login|register`), mounted by the root layout.
 * Closing goes back to the page without the modal; signing in continues to `redirect`, or
 * stays on the page.
 */
export function AuthModal({ mode, redirect }: { mode: AuthMode; redirect: string | undefined }) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const href = useRouterState({ select: (state) => state.location.href })
  const page = withoutAuthModal(href)
  const keepPage = { resetScroll: false, hashScrollIntoView: false, replace: true } as const

  // Opened from this page (a push): going back closes it. A shared link with the modal open
  // has nothing behind it, so the parameters are dropped in place.
  const close = () => (canGoBack ? router.history.back() : void navigate({ href: page, ...keepPage }))

  return (
    <AuthDialog
      mode={mode}
      redirect={redirect ?? page}
      onClose={close}
      onModeChange={(next) => void navigate({ href: withAuthModal(href, next, redirect), ...keepPage })}
    />
  )
}
