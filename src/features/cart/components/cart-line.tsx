import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { lineSubtotal } from '@/domain/cart'
import { maxLineQuantity } from '@/domain/nft'
import { type CartItemDto } from '@/shared/api/dtos/cart'
import { type QuoteLineDto } from '@/shared/api/dtos/quote'
import { NftImage } from '@/shared/components/nft-image'
import { QuantityStepper } from '@/shared/components/quantity-stepper'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'

interface CartLineProps {
  item: CartItemDto
  /** Line of the API quote: the reference for totals and stock issues. */
  quoteLine: QuoteLineDto | undefined
  changed: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  removing: boolean
}

function LineIssue({ quoteLine, onFix }: { quoteLine: QuoteLineDto | undefined; onFix: (quantity: number) => void }) {
  const issue = quoteLine?.issue
  if (!issue) return null
  if (issue.kind === 'sold-out') {
    return (
      <p role="status" className="text-xs text-warning">
        Edição esgotada. Remova o item para continuar.
      </p>
    )
  }
  if (issue.kind === 'quantity-reduced') {
    return (
      <p role="status" className="flex flex-wrap items-center gap-2 text-xs text-warning">
        Só há {issue.allowed} disponível(is).
        <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onFix(issue.allowed)}>
          Ajustar para {issue.allowed}
        </Button>
      </p>
    )
  }
  return null
}

/** Row of the "Cart Table" (desktop) / item card (mobile). */
export function CartLine({ item, quoteLine, changed, onQuantityChange, onRemove, removing }: CartLineProps) {
  const total = quoteLine?.lineTotal ?? lineSubtotal(item.unitPrice, item.quantity)
  const max = Math.max(maxLineQuantity(item), item.quantity)

  const remove = (
    <button
      type="button"
      onClick={onRemove}
      disabled={removing}
      aria-label={`Remover ${item.name} do carrinho`}
      className="grid size-8 place-items-center rounded-md text-sand hover:text-amber disabled:opacity-50"
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  )

  return (
    <li
      className={cn(
        'relative overflow-hidden rounded-2xl bg-surface md:grid md:min-h-[54px] md:grid-cols-[236px_106px_104px_1fr_auto] md:items-center md:gap-0 md:rounded-none md:pr-6',
        changed && 'ring-2 ring-warning',
        removing && 'opacity-60',
      )}
    >
      {/* Desktop row */}
      <div className="hidden items-center gap-3 md:flex">
        <NftImage image={item.image} decorative sizes="52px" className="size-[52px] rounded-sm" />
        <div className="min-w-0">
          <p className="truncate text-base leading-5 font-bold text-foreground">
            <Link
              to="/nfts/$nftId"
              params={{ nftId: item.nftId }}
              search={{ edition: item.editionId }}
              className="hover:text-amber"
            >
              {item.name}
            </Link>
          </p>
          <p className="truncate text-sm text-sand">
            ID do token: {item.tokenId} · {item.editionLabel}
          </p>
        </div>
      </div>
      <p className="hidden text-base font-bold text-sand md:block">{formatEth(item.unitPrice)}</p>
      <QuantityStepper
        className="hidden md:flex"
        size="sm"
        label={item.name}
        value={item.quantity}
        max={max}
        onChange={onQuantityChange}
      />
      <p className="hidden text-base font-bold text-amber md:block">{formatEth(total)}</p>
      <div className="hidden md:block">{remove}</div>

      {/* Mobile card */}
      <div className="flex gap-3 md:hidden">
        <NftImage image={item.image} decorative sizes="100px" className="size-[100px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-2">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-bold text-foreground">{item.name}</p>
            {remove}
          </div>
          <p className="text-sm text-sand">Edição: {item.editionLabel}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-amber">{formatEth(total)}</p>
            <QuantityStepper size="sm" label={item.name} value={item.quantity} max={max} onChange={onQuantityChange} />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2 md:col-span-full md:px-0 md:pb-0 md:empty:hidden">
        <LineIssue quoteLine={quoteLine} onFix={onQuantityChange} />
      </div>
    </li>
  )
}
