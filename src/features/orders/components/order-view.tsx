import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, MailCheck, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { isTerminal } from '@/domain/order'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { clearCheckoutDraft } from '@/features/checkout/draft'
import { PROVIDER_LABELS } from '@/features/wallets/queries'
import { type OrderDto } from '@/shared/api/dtos/order'
import { hasErrorCode } from '@/shared/api/errors'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { NftImage } from '@/shared/components/nft-image'
import { formatEth, shortenAddress } from '@/shared/lib/format'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'
import { Button } from '@/shared/ui/button'
import { clearAttempt, forgetPendingOrder } from '../attempt'
import { orderQuery } from '../queries'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function Card({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[580px] flex-col bg-surface">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar e voltar ao início"
        className="absolute top-4 right-4 grid size-8 place-items-center rounded-md text-amber hover:bg-surface-dark"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
      {children}
    </div>
  )
}

function OrderItemsTable({ order }: { order: OrderDto }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-6 md:px-11">
      <h2 className="text-sm font-bold text-foreground">Detalhes da transação</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-sm text-foreground">
            <th scope="col" className="pb-2 font-bold">
              NFTs
            </th>
            <th scope="col" className="pb-2 text-center font-bold">
              Edições
            </th>
            <th scope="col" className="pb-2 text-right font-bold">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={`${item.nftId}:${item.editionId}`}>
              {/* w-full + max-w-0: the name column takes the remaining width and truncates on phones. */}
              <td className="w-full max-w-0 py-2">
                <div className="flex items-center gap-3">
                  <NftImage image={item.image} decorative sizes="52px" className="size-[52px] shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-sand">
                      {item.editionLabel} · {formatEth(item.unitPrice)} cada
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-center text-xs whitespace-nowrap text-sand">(x {item.quantity})</td>
              <td className="py-2 text-right text-base font-bold whitespace-nowrap text-amber">
                {formatEth(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto flex w-full max-w-[300px] flex-col gap-1 text-sm">
        {order.discount !== '0' ? (
          <div className="flex justify-between">
            <dt className="text-foreground">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
            <dd className="text-foreground">(-) {formatEth(order.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-foreground">Taxa de rede</dt>
          <dd className="text-base text-foreground">{formatEth(order.networkFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1">
          <dt className="font-bold text-foreground">Total</dt>
          <dd className="text-lg font-bold text-amber">{formatEth(order.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Receipt of a confirmed order: rendered only from the immutable order snapshot. */
function Receipt({ order, onClose }: { order: OrderDto; onClose: () => void }) {
  const network = NETWORK_LABELS[order.network]
  return (
    <Card onClose={onClose}>
      <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-5">
        <MailCheck aria-hidden="true" className="size-14 stroke-[1.4] text-primary" />
        <h1 className="text-center text-base font-bold text-amber">Seus NFTs agora estão na sua carteira</h1>
      </div>
      <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-xs md:grid-cols-4 md:divide-x md:divide-primary md:px-7">
        <div className="md:pr-3">
          <dt className="font-bold text-foreground">ID da transação</dt>
          <dd className="font-mono text-sand">{order.transaction ? shortenAddress(order.transaction.hash) : '—'}</dd>
        </div>
        <div className="md:px-3">
          <dt className="text-sand">Data</dt>
          <dd className="text-sand">
            <time dateTime={order.updatedAt}>{dateFormatter.format(new Date(order.updatedAt))}</time>
          </dd>
        </div>
        <div className="md:px-3">
          <dt className="text-sand">Total</dt>
          <dd className="text-sand">{formatEth(order.total)}</dd>
        </div>
        <div className="md:pl-3">
          <dt className="font-bold text-foreground">Carteira</dt>
          <dd className="text-sand">{PROVIDER_LABELS[order.wallet.provider]}</dd>
        </div>
      </dl>
      <p className="px-6 pt-4 text-center text-xs text-sand md:px-11">
        Pedido {order.id} · {order.wallet.label} ({shortenAddress(order.wallet.address)})
      </p>
      <OrderItemsTable order={order} />
      <div className="flex flex-col items-center gap-4 border-t border-border px-6 pt-4 pb-6 md:px-11">
        <p className="text-center text-xs leading-5 text-sand">
          Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na
          rede.
        </p>
        {order.transaction ? (
          // The label wraps on narrow phones (and at high zoom) instead of overflowing.
          <Button asChild className="h-auto min-h-10 max-w-full py-2.5 text-center whitespace-normal">
            <a href={order.transaction.explorerUrl} target="_blank" rel="noopener noreferrer">
              Ver no explorador da {network}
              <span className="sr-only"> (simulado, abre em nova aba)</span>
            </a>
          </Button>
        ) : null}
        <p className="text-[11px] text-sand">Referência e link de exploração simulados.</p>
      </div>
    </Card>
  )
}

function PendingOrder({ order, onClose }: { order: OrderDto; onClose: () => void }) {
  return (
    <Card onClose={onClose}>
      <div role="status" className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <Loader2 aria-hidden="true" className="size-12 animate-spin text-primary motion-reduce:animate-none" />
        <h1 className="text-lg font-bold text-amber">Processando pagamento</h1>
        <p className="max-w-sm text-sm leading-6 text-sand">
          Aguardando a confirmação da rede {NETWORK_LABELS[order.network]}. Você pode recarregar ou fechar esta página:
          o pedido continua sendo acompanhado e não será cobrado duas vezes.
        </p>
        <p className="font-mono text-xs text-sand">Pedido {order.id}</p>
      </div>
      <OrderItemsTable order={order} />
    </Card>
  )
}

function DeclinedOrder({ order, onClose }: { order: OrderDto; onClose: () => void }) {
  return (
    <Card onClose={onClose}>
      <div role="alert" className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <XCircle aria-hidden="true" className="size-12 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">Pagamento recusado</h1>
        <p className="max-w-sm text-sm leading-6 text-sand">
          {order.declineReason ?? 'A carteira recusou o pagamento.'} Nenhum valor foi cobrado e seus itens continuam no
          carrinho.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/checkout">Tentar outra carteira</Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function OrderView({ orderId }: { orderId: string }) {
  const owner = useCacheOwner()
  const user = useSessionUser()
  const navigate = useNavigate()
  const query = useQuery(orderQuery(owner, orderId))
  const status = query.data?.status
  const close = () => void navigate({ to: '/' })

  // Terminal orders end the purchase attempt (no more recovery redirects).
  useEffect(() => {
    if (!user || !status || !isTerminal(status)) return
    forgetPendingOrder(user.id)
    clearAttempt(user.id)
    if (status === 'confirmed') clearCheckoutDraft(user.id)
  }, [user, status])

  let content: React.ReactNode
  if (query.isPending) {
    content = <div aria-busy="true" className="skeleton mx-auto h-[640px] w-full max-w-[580px]" />
  } else if (query.isError) {
    content =
      hasErrorCode(query.error, 'NOT_FOUND') || hasErrorCode(query.error, 'FORBIDDEN') ? (
        <EmptyState
          title="Pedido não encontrado"
          description="Este pedido não existe ou pertence a outra conta."
          action={
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      )
  } else if (query.data.status === 'confirmed') {
    content = <Receipt order={query.data} onClose={close} />
  } else if (query.data.status === 'declined') {
    content = <DeclinedOrder order={query.data} onClose={close} />
  } else {
    content = <PendingOrder order={query.data} onClose={close} />
  }

  return <main className="page-container py-10 md:py-16">{content}</main>
}
