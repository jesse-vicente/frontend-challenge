import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { lineKey } from '@/domain/cart'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { MobilePageHeader } from '@/shared/components/mobile-page-header'
import { cn } from '@/shared/lib/cn'
import { useRealtimeState } from '@/shared/realtime/realtime-store'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { Button } from '@/shared/ui/button'
import { cartQuery, ESTIMATE_NETWORK, quoteQuery, useRemoveCartItem, useUpdateCartItem } from '../queries'
import { CartLine } from './cart-line'
import { CartNotices } from './cart-notices'
import { CouponForm } from './coupon-form'
import { QuoteSummary } from './quote-summary'

const SKELETON_ROWS = ['a', 'b', 'c']

export function CartView() {
  const owner = useCacheOwner()
  const navigate = useNavigate()
  const cart = useQuery(cartQuery(owner))
  const hasItems = (cart.data?.items.length ?? 0) > 0
  const quote = useQuery({ ...quoteQuery(owner, ESTIMATE_NETWORK), enabled: hasItems })
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const { cartNotices } = useRealtimeState()
  const changedKeys = new Set(cartNotices.map((notice) => `${notice.nftId}:${notice.editionId}`))

  const quoteLines = new Map(quote.data?.lines.map((line) => [line.cartItemId, line]))
  const ready = hasItems && quote.isSuccess && !quote.isFetching && quote.data.purchasable

  let body: React.ReactNode
  if (cart.isPending) {
    body = (
      <ul aria-busy="true" title="Carregando carrinho" className="flex flex-col gap-2.5">
        {SKELETON_ROWS.map((key) => (
          <li key={key} className="skeleton h-[100px] rounded-2xl md:h-[54px] md:rounded-none" />
        ))}
      </ul>
    )
  } else if (cart.isError) {
    body = (
      <ErrorState
        title="Não foi possível carregar o carrinho"
        error={cart.error}
        retrying={cart.isFetching}
        onRetry={() => void cart.refetch()}
      />
    )
  } else if (!hasItems) {
    body = (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Explore o mercado e adicione NFTs para colecionar."
        action={
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar NFTs
            </Link>
          </Button>
        }
      />
    )
  } else {
    body = (
      <ul aria-label="Itens do carrinho" className="flex flex-col gap-2.5">
        {cart.data.items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            quoteLine={quoteLines.get(item.id)}
            changed={changedKeys.has(lineKey(item))}
            onQuantityChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
            onRemove={() => remove.mutate(item.id)}
            removing={remove.isPending && remove.variables === item.id}
          />
        ))}
      </ul>
    )
  }

  return (
    <main className="page-container flex flex-col gap-24 pt-6 pb-8 md:pt-8">
      <div className="flex flex-col gap-3">
        <MobilePageHeader title="Carrinho de NFTs" />
        <nav aria-label="Trilha de navegação" className="hidden md:block">
          <ol className="flex gap-1 text-sm leading-4 font-bold text-foreground">
            <li>
              <Link to="/" className="hover:text-amber">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash="mercado" className="hover:text-amber">
                Mercado
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>
        <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <section aria-label="Itens" className="flex min-w-0 flex-col gap-3 lg:w-[782px]">
            <CartNotices />
            <div
              aria-hidden="true"
              className={cn(
                'hidden grid-cols-[236px_106px_104px_1fr_auto] border-b border-border pb-2 text-base font-bold text-foreground',
                hasItems && 'md:grid',
              )}
            >
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span className="w-8" />
            </div>
            {body}
          </section>

          {hasItems ? (
            <aside
              aria-labelledby="summary-title"
              className="flex flex-col gap-6 max-md:-mx-4 max-md:rounded-t-[32px] max-md:bg-surface max-md:px-6 max-md:pt-6 max-md:pb-10 lg:w-[332px]"
            >
              <h2
                id="summary-title"
                className="border-b border-border pb-3 text-lg font-bold text-foreground max-md:sr-only"
              >
                Resumo da carteira
              </h2>
              <CouponForm appliedCode={cart.data?.couponCode ?? null} rejection={quote.data?.couponRejection ?? null} />
              {quote.isError ? (
                <ErrorState
                  title="Não foi possível calcular os valores"
                  error={quote.error}
                  retrying={quote.isFetching}
                  onRetry={() => void quote.refetch()}
                  className="py-6"
                />
              ) : (
                <QuoteSummary quote={quote.data} loading={quote.isPending} />
              )}
              <div className="flex flex-col items-center gap-3">
                <Button
                  className="h-10 w-full max-md:h-[60px] max-md:rounded-[30px] max-md:bg-[linear-gradient(90deg,#d28a4c,#a86d3b)]"
                  disabled={!ready}
                  aria-disabled={!ready}
                  onClick={() => void navigate({ to: '/checkout' })}
                >
                  Conectar e finalizar
                </Button>
                {quote.data && !quote.data.purchasable ? (
                  <p role="status" className="text-center text-xs text-warning">
                    Ajuste os itens indisponíveis para continuar.
                  </p>
                ) : null}
                <Link to="/" hash="mercado" className="text-sm text-amber hover:underline max-md:hidden">
                  Continuar explorando
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
      <div className="hidden md:block">
        <NftCarousel title="Colecionadores também viram" params={{ segment: 'trending' }} />
      </div>
    </main>
  )
}
