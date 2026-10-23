import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { PROVIDER_LABELS, walletDisplayName } from '@/features/wallets/queries'
import { type CartItemDto } from '@/shared/api/dtos/cart'
import { type QuoteDto } from '@/shared/api/dtos/quote'
import { type WalletDto, type WalletProvider, walletProviderSchema } from '@/shared/api/dtos/wallet'
import { NftImage } from '@/shared/components/nft-image'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/format'

const radioClass =
  'size-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[5px] checked:bg-ink'

/** "Seus NFTs": quoted lines (quantities and totals from the API quote). */
export function OrderItems({ quote, items }: { quote: QuoteDto | undefined; items: readonly CartItemDto[] }) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const lines = quote?.lines ?? []
  return (
    <section aria-labelledby="checkout-items" className="flex flex-col gap-2">
      <h2 id="checkout-items" className="text-base font-bold text-foreground">
        Seus NFTs
      </h2>
      <div
        aria-hidden="true"
        className="flex justify-between border-b border-border pb-2 text-sm font-bold text-foreground"
      >
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => {
          const item = byId.get(line.cartItemId)
          return (
            <li key={line.cartItemId} className="flex items-center gap-2 bg-surface pr-3">
              {item ? <NftImage image={item.image} decorative sizes="52px" className="size-[52px] shrink-0" /> : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{line.name}</p>
                <p className="truncate text-xs text-sand">ID do token: {item?.tokenId ?? '—'}</p>
              </div>
              <span className="text-xs text-sand">(x {line.effectiveQuantity})</span>
              <span className="text-sm font-bold text-amber">{formatEth(line.lineTotal)}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-center text-sm text-foreground">
        Tem um código promocional?{' '}
        <Link to="/cart" className="text-amber hover:underline">
          Aplique aqui
        </Link>
      </p>
    </section>
  )
}

/** "Carteira e rede": wallet app used to sign the payment (simulated connection). */
export function ProviderOptions({
  value,
  onChange,
  error,
}: {
  value: WalletProvider | ''
  onChange: (provider: WalletProvider) => void
  error?: string | undefined
}) {
  const titleId = useId()
  const errorId = useId()
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend id={titleId} className="mb-3 w-full text-base font-bold text-foreground md:text-center">
        Carteira e rede
      </legend>
      {walletProviderSchema.options.map((provider) => (
        <label
          key={provider}
          className={cn(
            'flex h-[50px] cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-4 text-sm text-foreground max-md:h-16 max-md:rounded-2xl max-md:border-0 max-md:bg-surface-dark',
            value === provider && 'border-primary',
          )}
        >
          <input
            type="radio"
            name="provider"
            value={provider}
            checked={value === provider}
            onChange={() => onChange(provider)}
            className={cn(radioClass, 'max-md:order-last max-md:ml-auto')}
          />
          <span
            aria-hidden="true"
            className="hidden size-10 place-items-center rounded-full border border-border-soft font-bold text-amber max-md:grid"
          >
            {PROVIDER_LABELS[provider][0]}
          </span>
          {PROVIDER_LABELS[provider]}
        </label>
      ))}
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

/** Mobile "Carteira conectada": registered wallets to pay with. */
export function WalletOptions({
  wallets,
  value,
  onChange,
}: {
  wallets: readonly WalletDto[]
  value: string
  onChange: (walletId: string) => void
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <div className="mb-1 flex items-center justify-between">
        <legend className="text-base font-bold text-foreground">Carteira conectada</legend>
        <Link to="/wallets" className="text-sm font-bold text-amber">
          Trocar carteira
        </Link>
      </div>
      {wallets.map((wallet) => (
        <label
          key={wallet.id}
          className={cn(
            'flex cursor-pointer items-start gap-4 rounded-2xl bg-surface-dark px-6 py-5',
            value === wallet.id && 'ring-1 ring-primary',
          )}
        >
          <input
            type="radio"
            name="wallet"
            value={wallet.id}
            checked={value === wallet.id}
            onChange={() => onChange(wallet.id)}
            className={cn(radioClass, 'mt-1')}
          />
          <span className="flex flex-col gap-1">
            <span className="text-base font-bold text-foreground">{wallet.label}</span>
            <span className="text-sm text-sand">{walletDisplayName(wallet)}</span>
            <span className="text-sm text-sand">
              {wallet.role === 'primary' ? 'Rede principal ' : 'Rede '}
              {NETWORK_LABELS[wallet.network]}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
