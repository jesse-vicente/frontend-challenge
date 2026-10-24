import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'
import { AccountLayout } from '@/features/profile/components/account-layout'
import { type WalletDto } from '@/shared/api/dtos/wallet'
import { ErrorState } from '@/shared/components/feedback-states'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { walletsQuery } from '../queries'
import { emptyWalletForm, type WalletFormValues, walletFormValues } from '../schemas'
import { WalletForm } from './wallet-form'

const addClass = 'text-[15px] font-bold text-amber hover:underline disabled:cursor-not-allowed disabled:opacity-50'

/** A secondary wallet "igual à principal" copies its data, except what must be unique. */
function copyOfPrimary(primary: WalletDto): WalletFormValues {
  return { ...walletFormValues(primary), label: '', address: '', secondaryAddress: '' }
}

function SecondaryWallet({ primary, secondary }: { primary: WalletDto | undefined; secondary: WalletDto | undefined }) {
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const sameId = useId()
  const open = Boolean(secondary) || adding

  const values = useMemo(() => {
    if (sameAsPrimary && primary) {
      const copy = copyOfPrimary(primary)
      return secondary ? { ...copy, label: secondary.label, address: secondary.address } : copy
    }
    return secondary ? walletFormValues(secondary) : emptyWalletForm
  }, [sameAsPrimary, primary, secondary])

  return (
    <section aria-labelledby="secondary-wallet-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="secondary-wallet-title" className="text-lg font-bold text-foreground">
          Carteira secundária
        </h2>
        <div className="flex items-center gap-2">
          <input
            id={sameId}
            type="checkbox"
            checked={sameAsPrimary}
            disabled={!primary}
            onChange={(event) => {
              setSameAsPrimary(event.target.checked)
              if (event.target.checked) setAdding(true)
            }}
            className="size-4 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[5px] disabled:opacity-40"
          />
          <label htmlFor={sameId} className="text-sm text-foreground">
            Igual à carteira principal
          </label>
          {secondary ? null : (
            <button
              type="button"
              className={addClass}
              aria-expanded={open}
              aria-controls="secondary-wallet-form"
              onClick={() => setAdding(true)}
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
      {open ? (
        <div id="secondary-wallet-form" className="mt-3">
          <WalletForm
            walletRole="secondary"
            wallet={secondary}
            values={values}
            onSaved={() => {
              setAdding(false)
              setSameAsPrimary(false)
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-sand">Você ainda não adicionou uma carteira secundária.</p>
      )}
    </section>
  )
}

export function WalletsView() {
  const owner = useCacheOwner()
  const wallets = useQuery(walletsQuery(owner))
  const primary = wallets.data?.find((wallet) => wallet.role === 'primary')
  const secondary = wallets.data?.find((wallet) => wallet.role === 'secondary')
  const primaryValues = useMemo(() => (primary ? walletFormValues(primary) : emptyWalletForm), [primary])

  return (
    <AccountLayout current="wallets" title="Carteiras">
      {wallets.isPending ? (
        <div aria-busy="true" className="skeleton h-[560px] rounded-lg" />
      ) : wallets.isError ? (
        <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="primary-wallet-title" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
              <div className="flex flex-col gap-1">
                <h1 id="primary-wallet-title" className="text-lg leading-5 font-bold text-foreground">
                  Carteira principal
                </h1>
                <p className="text-sm text-sand">
                  Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
                </p>
              </div>
              {primary ? null : (
                <button
                  type="button"
                  className={addClass}
                  onClick={() => document.querySelector<HTMLInputElement>('#primary-wallet-form input')?.focus()}
                >
                  Adicionar
                </button>
              )}
            </div>
            <div id="primary-wallet-form">
              <WalletForm walletRole="primary" wallet={primary} values={primaryValues} />
            </div>
          </section>
          <SecondaryWallet primary={primary} secondary={secondary} />
        </div>
      )}
    </AccountLayout>
  )
}
