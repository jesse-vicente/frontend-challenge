import { Link } from '@tanstack/react-router'
import { type QuoteChange } from '@/domain/quote'
import { QuoteSummary } from '@/features/cart/components/quote-summary'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { PROVIDER_LABELS, walletDisplayName } from '@/features/wallets/queries'
import { type Network } from '@/shared/api/dtos/network'
import { type QuoteDto } from '@/shared/api/dtos/quote'
import { type WalletDto, type WalletProvider } from '@/shared/api/dtos/wallet'
import { formatEth } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/shared/ui/dialog'

export interface ReviewState {
  quote: QuoteDto
  /** Differences from the quote the collector saw before; non-empty means "confirm again". */
  changes: QuoteChange[]
}

function describeChange(change: QuoteChange, quote: QuoteDto): string {
  const nameOf = (key: string) => quote.lines.find((line) => `${line.nftId}:${line.editionId}` === key)?.name ?? 'Item'
  switch (change.kind) {
    case 'price':
      return `${nameOf(change.key)}: preço de ${formatEth(change.from)} para ${formatEth(change.to)}.`
    case 'availability':
      return change.to === 0
        ? `${nameOf(change.key)}: edição esgotada.`
        : `${nameOf(change.key)}: quantidade disponível de ${change.from} para ${change.to}.`
    case 'line-added':
      return 'Um item foi adicionado ao carrinho.'
    case 'line-removed':
      return 'Um item saiu do carrinho.'
    case 'discount':
      return `Desconto de ${formatEth(change.from)} para ${formatEth(change.to)}.`
    case 'network-fee':
      return `Taxa de rede de ${formatEth(change.from)} para ${formatEth(change.to)}.`
    case 'total':
      return `Total de ${formatEth(change.from)} para ${formatEth(change.to)}.`
  }
}

interface ReviewDialogProps {
  review: ReviewState | null
  wallet: WalletDto | undefined
  provider: WalletProvider | ''
  network: Network | ''
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

/** Review step before the order is sent; prices and fees come from a fresh quote. */
export function ReviewDialog({
  review,
  wallet,
  provider,
  network,
  submitting,
  error,
  onConfirm,
  onClose,
}: ReviewDialogProps) {
  const quote = review?.quote
  const changed = (review?.changes.length ?? 0) > 0
  const blocked = quote ? !quote.purchasable : true

  return (
    <Dialog open={review !== null} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[560px] max-w-[calc(100vw-2rem)] gap-5 overflow-y-auto border-border bg-surface sm:max-w-[560px]">
        <DialogTitle className="text-lg font-bold text-foreground">Revise seu pedido</DialogTitle>
        <DialogDescription className="text-sm text-sand">
          Valores recalculados agora pela Kurio. Confirme para enviar o pagamento.
        </DialogDescription>

        {changed && quote ? (
          <div role="alert" className="rounded-md border border-warning/60 bg-surface-dark px-4 py-3 text-sm">
            <p className="font-bold text-warning">Os valores mudaram desde a sua última revisão</p>
            <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-sand">
              {review?.changes.map((change) => (
                <li key={`${change.kind}-${'key' in change ? change.key : ''}`}>{describeChange(change, quote)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {quote ? (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {quote.lines.map((line) => (
                <li key={line.cartItemId} className="flex justify-between gap-3">
                  <span className="text-foreground">
                    {line.name} <span className="text-sand">(x {line.effectiveQuantity})</span>
                  </span>
                  <span className="font-bold text-amber">{formatEth(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <QuoteSummary quote={quote} loading={false} feeHint={`Rede ${NETWORK_LABELS[quote.network]}`} />
          </>
        ) : null}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-sand">Carteira</dt>
          <dd className="text-foreground">{wallet ? `${wallet.label} · ${walletDisplayName(wallet)}` : '—'}</dd>
          <dt className="text-sand">Conexão</dt>
          <dd className="text-foreground">{provider ? PROVIDER_LABELS[provider] : '—'}</dd>
          <dt className="text-sand">Rede</dt>
          <dd className="text-foreground">{network ? NETWORK_LABELS[network] : '—'}</dd>
        </dl>

        {blocked ? (
          <p role="alert" className="text-sm text-warning">
            Há itens indisponíveis.{' '}
            <Link to="/cart" className="text-amber underline">
              Ajuste o carrinho
            </Link>{' '}
            para continuar.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={onConfirm} disabled={submitting || blocked} aria-disabled={submitting || blocked}>
            {submitting ? 'Enviando pedido…' : changed ? 'Confirmar com os novos valores' : 'Confirmar e pagar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
