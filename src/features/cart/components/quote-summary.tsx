import { type QuoteDto } from '@/shared/api/dtos/quote'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/format'

/**
 * Totals exactly as returned by the quote API (never recomputed on the client).
 * The skeleton keeps the same height to avoid layout shifts.
 */
export function QuoteSummary({
  quote,
  loading,
  feeHint = 'Taxa estimada',
  className,
}: {
  quote: QuoteDto | undefined
  loading: boolean
  feeHint?: string
  className?: string
}) {
  if (loading || !quote) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Calculando valores"
        className={cn('flex flex-col gap-4', className)}
      >
        {['subtotal', 'discount', 'fee'].map((row) => (
          <div key={row} className="flex justify-between">
            <span className="skeleton h-4 w-32 rounded-sm" />
            <span className="skeleton h-4 w-20 rounded-sm" />
          </div>
        ))}
        <div className="mt-3 flex justify-between">
          <span className="skeleton h-5 w-16 rounded-sm" />
          <span className="skeleton h-5 w-28 rounded-sm" />
        </div>
      </div>
    )
  }

  return (
    <dl className={cn('flex flex-col gap-3 text-sm text-foreground', className)}>
      <div className="flex items-baseline justify-between">
        <dt>Subtotal</dt>
        <dd className="text-base">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex items-baseline justify-between">
        <dt>Desconto do lançamento{quote.appliedCoupon ? ` (${quote.appliedCoupon})` : ''}</dt>
        <dd>(-) {formatEth(quote.discount)}</dd>
      </div>
      <div className="flex items-start justify-between">
        <dt>Taxa de rede</dt>
        <dd className="flex flex-col items-end gap-1">
          <span className="text-base">{formatEth(quote.networkFee)}</span>
          <span className="text-[11px] text-amber">{feeHint}</span>
        </dd>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-4 md:border-0 md:pt-0">
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-lg font-bold text-amber">{formatEth(quote.total)}</dd>
      </div>
    </dl>
  )
}
