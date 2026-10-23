import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { CartNotices } from '@/features/cart/components/cart-notices'
import { QuoteSummary } from '@/features/cart/components/quote-summary'
import { cartQuery, ESTIMATE_NETWORK, quoteQuery } from '@/features/cart/queries'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { pendingOrderOf } from '@/features/orders/attempt'
import { profileQuery } from '@/features/profile/queries'
import { PROVIDER_LABELS, walletDisplayName, walletsQuery } from '@/features/wallets/queries'
import { type Network } from '@/shared/api/dtos/network'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { MobilePageHeader } from '@/shared/components/mobile-page-header'
import { formatEth } from '@/shared/lib/format'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'
import { Button } from '@/shared/ui/button'
import { Form } from '@/shared/ui/form'
import { readCheckoutDraft, usePersistCheckoutDraft } from '../draft'
import {
  type CheckoutFormValues,
  checkoutFormSchema,
  emptyCheckoutForm,
  toCollector,
  valuesFromWallet,
} from '../schema'
import { useCheckoutFlow } from '../use-checkout-flow'
import { OrderItems, ProviderOptions, WalletOptions } from './checkout-options'
import { CollectorFields } from './collector-fields'
import { ReviewDialog } from './review-dialog'

function ConnectionStatus({ flow }: { flow: ReturnType<typeof useCheckoutFlow> }) {
  const { connection } = flow
  if (connection.status === 'idle') return null
  const label = PROVIDER_LABELS[connection.provider]
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
    >
      {connection.status === 'connecting' ? <span className="text-sand">Conectando à {label}…</span> : null}
      {connection.status === 'connected' ? (
        <>
          <span className="text-success">● {label} conectada</span>
          <button type="button" onClick={flow.disconnect} className="text-amber underline">
            Desconectar
          </button>
        </>
      ) : null}
      {connection.status === 'rejected' ? (
        <span className="text-destructive">{label} recusou a conexão. Tente novamente ou escolha outra carteira.</span>
      ) : null}
    </div>
  )
}

export function CheckoutView() {
  const user = useSessionUser()
  const owner = useCacheOwner()
  const cart = useQuery(cartQuery(owner))
  const wallets = useQuery(walletsQuery(owner))
  const profile = useQuery(profileQuery(owner))
  const flow = useCheckoutFlow()
  const prefilled = useRef(false)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { ...emptyCheckoutForm, ...(user ? readCheckoutDraft(user.id) : null) },
  })
  usePersistCheckoutDraft(user?.id ?? 'anonymous', form.watch)

  const primary = wallets.data?.find((wallet) => wallet.role === 'primary') ?? wallets.data?.[0]
  const secondary = wallets.data?.find((wallet) => wallet.role === 'secondary')
  const walletId = form.watch('walletId')
  const useOther = form.watch('useOtherWallet')
  const provider = form.watch('provider')
  const network = form.watch('network')
  const selectedWallet = wallets.data?.find((wallet) => wallet.id === walletId)

  // Prefill once from the primary wallet unless a draft already chose one.
  useEffect(() => {
    if (prefilled.current || !primary || !profile.isSuccess) return
    prefilled.current = true
    const current = form.getValues()
    if (!current.walletId) form.reset(valuesFromWallet(primary, profile.data, current))
  }, [primary, profile.isSuccess, profile.data, form])

  // "Usar outra carteira?" switches between the registered primary and secondary wallets.
  useEffect(() => {
    const target = useOther ? secondary : primary
    if (!target || target.id === form.getValues('walletId')) return
    form.reset(valuesFromWallet(target, profile.data, { ...form.getValues(), useOtherWallet: useOther }))
  }, [useOther, primary, secondary, profile.data, form])

  const quoteNetwork: Network = network || ESTIMATE_NETWORK
  const hasItems = (cart.data?.items.length ?? 0) > 0
  const quote = useQuery({ ...quoteQuery(owner, quoteNetwork), enabled: hasItems })

  const submit = form.handleSubmit(async (values) => {
    const parsed = checkoutFormSchema.parse(values)
    await flow.startReview(
      { walletId: parsed.walletId, provider: parsed.provider, network: parsed.network, collector: toCollector(parsed) },
      quote.data,
    )
  })

  const pendingOrderId = useMemo(() => (user ? pendingOrderOf(user.id) : null), [user])
  if (pendingOrderId) return <Navigate to="/orders/$orderId" params={{ orderId: pendingOrderId }} replace />

  if (cart.isPending || wallets.isPending) {
    return (
      <main aria-busy="true" className="page-container grid gap-8 pt-8 lg:grid-cols-[760px_404px] lg:justify-between">
        <div className="skeleton h-[560px] rounded-lg" />
        <div className="skeleton h-[560px] rounded-lg" />
      </main>
    )
  }
  if (cart.isError || wallets.isError) {
    return (
      <main className="page-container py-16">
        <ErrorState
          error={cart.error ?? wallets.error}
          onRetry={() => {
            void cart.refetch()
            void wallets.refetch()
          }}
        />
      </main>
    )
  }
  // An attempt in progress keeps the review open even if the order settles (and the
  // cart empties) before the response arrives, e.g. after a timeout.
  if (!hasItems && !flow.review) {
    return (
      <main className="page-container py-16">
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para finalizar uma compra."
          action={
            <Button asChild>
              <Link to="/" hash="mercado">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      </main>
    )
  }
  if ((wallets.data?.length ?? 0) === 0) {
    return (
      <main className="page-container py-16">
        <EmptyState
          title="Cadastre uma carteira para pagar"
          description="O pagamento usa as carteiras cadastradas no seu perfil."
          action={
            <Button asChild>
              <Link to="/wallets">Cadastrar carteira</Link>
            </Button>
          }
        />
      </main>
    )
  }

  const confirmButton = (
    <Button
      type="submit"
      className="h-[45px] w-full max-md:h-[60px] max-md:rounded-[30px] max-md:bg-[linear-gradient(90deg,#d28a4c,#a86d3b)]"
      disabled={form.formState.isSubmitting || flow.connection.status === 'connecting' || !quote.data?.purchasable}
    >
      {flow.connection.status === 'connecting' ? 'Conectando carteira…' : 'Confirmar compra'}
    </Button>
  )

  return (
    <main className="page-container pt-6 pb-10 md:pt-8">
      <MobilePageHeader title="Pagamento com carteira" fallback="/cart" />
      <nav aria-label="Trilha de navegação" className="mb-4 hidden md:block">
        <ol className="flex gap-1 text-sm leading-4 font-bold text-foreground">
          <li>
            <Link to="/" className="hover:text-amber">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/cart" className="hover:text-amber">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only max-md:hidden">Pagamento</h1>

      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <section aria-labelledby="collector-title" className="flex flex-col gap-6 lg:w-[760px]">
            <div className="flex flex-col gap-6 md:hidden">
              <WalletOptions
                wallets={wallets.data ?? []}
                value={walletId}
                onChange={(id) => form.setValue('useOtherWallet', id === secondary?.id, { shouldDirty: true })}
              />
            </div>
            <details className="group md:contents" open={Object.keys(form.formState.errors).length > 0 || undefined}>
              <summary className="cursor-pointer list-none text-sm font-bold text-amber md:hidden">
                Dados do colecionador
              </summary>
              <h2 id="collector-title" className="mb-4 text-lg font-bold text-foreground max-md:sr-only">
                Perfil do colecionador
              </h2>
              <CollectorFields control={form.control} wallet={selectedWallet} hasSecondary={Boolean(secondary)} />
            </details>
          </section>

          <aside aria-label="Resumo do pagamento" className="flex flex-col gap-5 lg:w-[404px]">
            <CartNotices />
            <div className="hidden md:block">
              <OrderItems quote={quote.data} items={cart.data.items} />
            </div>
            {quote.isError ? (
              <ErrorState error={quote.error} onRetry={() => void quote.refetch()} className="py-6" />
            ) : (
              <div className="hidden md:block">
                <QuoteSummary
                  quote={quote.data}
                  loading={quote.isPending}
                  feeHint={network ? `Rede ${NETWORK_LABELS[network]}` : 'Taxa estimada'}
                />
              </div>
            )}
            <ProviderOptions
              value={provider}
              onChange={(value) => form.setValue('provider', value, { shouldValidate: true, shouldDirty: true })}
              error={form.formState.errors.provider?.message}
            />
            <ConnectionStatus flow={flow} />
            <p className="flex items-baseline justify-end gap-6 font-bold md:hidden">
              <span className="text-lg text-foreground">Total:</span>
              <span className="text-xl text-amber">{quote.data ? formatEth(quote.data.total) : '—'}</span>
            </p>
            {selectedWallet ? (
              <p className="hidden text-xs text-sand md:block">
                Pagando com {selectedWallet.label} · {walletDisplayName(selectedWallet)}
              </p>
            ) : null}
            {confirmButton}
          </aside>
        </form>
      </Form>

      <ReviewDialog
        review={flow.review}
        wallet={selectedWallet}
        provider={provider}
        network={flow.reviewNetwork}
        submitting={flow.submitting}
        error={flow.orderError}
        onConfirm={() => void flow.confirm()}
        onClose={flow.closeReview}
      />
    </main>
  )
}
